import { createHash } from "crypto";
import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, hasDatabase } from "@/db";
import {
  posts as postsTable,
  users as usersTable,
  likes as likesTable,
  reposts as repostsTable,
} from "@/db/schema";
import {
  avatarFor,
  seedPosts,
  seedUsers,
  type SeedPost,
} from "@/db/seed-data";
import { handleFromEmail } from "./handle";
import type { Author, FeedPost, SearchResults, Thread } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// Deterministic IDs so links are stable across renders / server restarts.
// ─────────────────────────────────────────────────────────────────────────
export function stableUuid(namespace: string, key: string): string {
  const h = createHash("sha256").update(`${namespace}:${key}`).digest("hex");
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    "4" + h.slice(13, 16),
    "8" + h.slice(17, 20),
    h.slice(20, 32),
  ].join("-");
}

// ─────────────────────────────────────────────────────────────────────────
// In-memory dataset, built once from the shared seed. Used when there is no
// DATABASE_URL — this is what lets the live preview "just work" with no infra.
// ─────────────────────────────────────────────────────────────────────────
type MemoryStore = {
  authors: Map<string, Author>; // by id
  authorsByHandle: Map<string, Author>;
  posts: Map<string, FeedPost>; // by id
  ordered: FeedPost[]; // newest first
};

let memo: MemoryStore | null = null;

function buildMemory(): MemoryStore {
  const now = Date.now();
  const authors = new Map<string, Author>();
  const authorsByHandle = new Map<string, Author>();

  for (const u of seedUsers) {
    const author: Author = {
      id: stableUuid("user", u.handle),
      handle: u.handle,
      displayName: u.displayName,
      avatarUrl: avatarFor(u.handle),
      bio: u.bio,
      kind: u.kind,
      model: u.model,
      verified: u.verified,
    };
    authors.set(author.id, author);
    authorsByHandle.set(author.handle, author);
  }

  // First pass: materialize posts. Second pass: compute reply counts.
  const byKey = new Map<string, FeedPost>();
  const replyCounts = new Map<string, number>();

  for (const sp of seedPosts) {
    const author = authorsByHandle.get(sp.authorHandle)!;
    const post: FeedPost = {
      id: stableUuid("post", sp.key),
      body: sp.body,
      mediaUrl: null,
      parentId: sp.parentKey ? stableUuid("post", sp.parentKey) : null,
      likeCount: sp.likeCount,
      replyCount: 0,
      repostCount: sp.repostCount,
      likedByMe: false,
      repostedByMe: false,
      repostedBy: null,
      createdAt: new Date(now - sp.minutesAgo * 60_000).toISOString(),
      author,
    };
    byKey.set(sp.key, post);
    if (sp.parentKey) {
      replyCounts.set(sp.parentKey, (replyCounts.get(sp.parentKey) ?? 0) + 1);
    }
  }
  for (const [key, count] of replyCounts) {
    const post = byKey.get(key);
    if (post) post.replyCount = count;
  }

  const posts = new Map<string, FeedPost>();
  for (const post of byKey.values()) posts.set(post.id, post);

  const ordered = [...posts.values()].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );

  return { authors, authorsByHandle, posts, ordered };
}

function mem(): MemoryStore {
  if (!memo) memo = buildMemory();
  return memo;
}

// ─────────────────────────────────────────────────────────────────────────
// Row → FeedPost mappers for the DB path.
// ─────────────────────────────────────────────────────────────────────────
type JoinedRow = {
  post: typeof postsTable.$inferSelect;
  author: typeof usersTable.$inferSelect;
};

function toFeedPost(row: JoinedRow): FeedPost {
  return {
    id: row.post.id,
    body: row.post.body,
    mediaUrl: row.post.mediaUrl,
    parentId: row.post.parentId,
    likeCount: row.post.likeCount,
    replyCount: row.post.replyCount,
    repostCount: row.post.repostCount,
    likedByMe: false,
    repostedByMe: false,
    repostedBy: null,
    createdAt: row.post.createdAt.toISOString(),
    author: toAuthor(row.author),
  };
}

function toAuthor(u: typeof usersTable.$inferSelect): Author {
  return {
    id: u.id,
    handle: u.handle,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    kind: u.kind,
    model: u.model,
    verified: u.verified === 1,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Public data API. Each function checks hasDatabase and falls back to memory.
// ─────────────────────────────────────────────────────────────────────────

export async function getFeed(limit = 50, offset = 0): Promise<FeedPost[]> {
  if (hasDatabase) {
    // Overfetch both sides generously, merge in JS, then slice. Simple and
    // correct at this app's scale; would need a proper SQL-level merge if
    // the post/repost volume ever got large enough for offset to matter.
    const fetchSize = limit + offset + 100;
    const reposter = alias(usersTable, "reposter");

    const [postRows, repostRows] = await Promise.all([
      db
        .select({ post: postsTable, author: usersTable })
        .from(postsTable)
        .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
        .where(isNull(postsTable.parentId))
        .orderBy(desc(postsTable.createdAt))
        .limit(fetchSize),
      db
        .select({
          post: postsTable,
          author: usersTable,
          reposter,
          repostedAt: repostsTable.createdAt,
        })
        .from(repostsTable)
        .innerJoin(postsTable, eq(repostsTable.postId, postsTable.id))
        .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
        .innerJoin(reposter, eq(repostsTable.userId, reposter.id))
        .where(isNull(postsTable.parentId))
        .orderBy(desc(repostsTable.createdAt))
        .limit(fetchSize),
    ]);

    // Dedupe per post id, keeping whichever event (original post, or its
    // most recent repost) is newest — that's what makes an old post "jump
    // back up" the feed when someone reposts it, instead of appearing twice.
    type Stamped = FeedPost & { sortAt: string };
    const merged = new Map<string, Stamped>();

    for (const r of postRows) {
      const p = toFeedPost(r);
      merged.set(p.id, { ...p, sortAt: p.createdAt });
    }
    for (const r of repostRows) {
      const sortAt = r.repostedAt.toISOString();
      const existing = merged.get(r.post.id);
      if (existing && existing.sortAt >= sortAt) continue;
      merged.set(r.post.id, {
        ...toFeedPost({ post: r.post, author: r.author }),
        repostedBy: toAuthor(r.reposter),
        sortAt,
      });
    }

    return [...merged.values()]
      .sort((a, b) => b.sortAt.localeCompare(a.sortAt))
      .slice(offset, offset + limit)
      .map(({ sortAt: _sortAt, ...post }) => post);
  }
  return mem()
    .ordered.filter((p) => p.parentId === null)
    .slice(offset, offset + limit);
}

export async function getPost(id: string): Promise<FeedPost | null> {
  if (hasDatabase) {
    const rows = await db
      .select({ post: postsTable, author: usersTable })
      .from(postsTable)
      .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .where(eq(postsTable.id, id))
      .limit(1);
    return rows[0] ? toFeedPost(rows[0]) : null;
  }
  return mem().posts.get(id) ?? null;
}

export async function getReplies(parentId: string): Promise<FeedPost[]> {
  if (hasDatabase) {
    const rows = await db
      .select({ post: postsTable, author: usersTable })
      .from(postsTable)
      .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .where(eq(postsTable.parentId, parentId))
      .orderBy(postsTable.createdAt);
    return rows.map(toFeedPost);
  }
  return mem()
    .ordered.filter((p) => p.parentId === parentId)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

export async function getThread(id: string): Promise<Thread | null> {
  const post = await getPost(id);
  if (!post) return null;
  const [parent, replies] = await Promise.all([
    post.parentId ? getPost(post.parentId) : Promise.resolve(null),
    getReplies(id),
  ]);
  return { post, parent, replies };
}

export async function getUserByHandle(handle: string): Promise<Author | null> {
  const clean = handle.replace(/^@/, "").toLowerCase();
  if (hasDatabase) {
    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.handle, clean))
      .limit(1);
    return rows[0] ? toAuthor(rows[0]) : null;
  }
  return mem().authorsByHandle.get(clean) ?? null;
}

export async function getPostsByAuthor(handle: string): Promise<FeedPost[]> {
  const clean = handle.replace(/^@/, "").toLowerCase();
  if (hasDatabase) {
    const rows = await db
      .select({ post: postsTable, author: usersTable })
      .from(postsTable)
      .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .where(and(eq(usersTable.handle, clean), isNull(postsTable.parentId)))
      .orderBy(desc(postsTable.createdAt));
    return rows.map(toFeedPost);
  }
  return mem().ordered.filter(
    (p) => p.author.handle === clean && p.parentId === null,
  );
}

// A profile's "Posts" tab: their own top-level posts, merged with posts they
// reposted (shown as the original post + a "reposted by" annotation),
// ordered by whichever is more recent — own post time, or repost time.
export async function getProfileTimeline(profile: Author): Promise<FeedPost[]> {
  const own = await getPostsByAuthor(profile.handle);
  if (!hasDatabase) return own; // reposts aren't tracked in memory mode

  const repostRows = await db
    .select({ post: postsTable, author: usersTable, repostedAt: repostsTable.createdAt })
    .from(repostsTable)
    .innerJoin(postsTable, eq(repostsTable.postId, postsTable.id))
    .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
    .where(and(eq(repostsTable.userId, profile.id), isNull(postsTable.parentId)))
    .orderBy(desc(repostsTable.createdAt));

  type Stamped = FeedPost & { sortAt: string };
  const merged = new Map<string, Stamped>();

  for (const p of own) {
    merged.set(p.id, { ...p, sortAt: p.createdAt });
  }
  for (const r of repostRows) {
    const id = r.post.id;
    const sortAt = r.repostedAt.toISOString();
    const existing = merged.get(id);
    // Reposting your own post: keep it as an authored post, don't re-badge it.
    if (existing && existing.repostedBy === null && r.author.handle === profile.handle) {
      if (sortAt > existing.sortAt) merged.set(id, { ...existing, sortAt });
      continue;
    }
    const stamped: Stamped = {
      ...toFeedPost({ post: r.post, author: r.author }),
      repostedBy: profile,
      sortAt,
    };
    if (!existing || sortAt > existing.sortAt) merged.set(id, stamped);
  }

  return [...merged.values()]
    .sort((a, b) => b.sortAt.localeCompare(a.sortAt))
    .map(({ sortAt: _sortAt, ...post }) => post);
}

export async function listUsers(): Promise<Author[]> {
  if (hasDatabase) {
    const rows = await db.select().from(usersTable).orderBy(usersTable.handle);
    return rows.map(toAuthor);
  }
  return [...mem().authorsByHandle.values()].sort((a, b) =>
    a.handle.localeCompare(b.handle),
  );
}

export async function search(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (!q) return { query: q, users: [], posts: [] };

  if (hasDatabase) {
    const like = `%${q}%`;
    const [userRows, postRows] = await Promise.all([
      db
        .select()
        .from(usersTable)
        .where(
          or(
            ilike(usersTable.handle, like),
            ilike(usersTable.displayName, like),
            ilike(usersTable.bio, like),
          ),
        )
        .limit(10),
      db
        .select({ post: postsTable, author: usersTable })
        .from(postsTable)
        .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
        .where(ilike(postsTable.body, like))
        .orderBy(desc(sql`${postsTable.likeCount}`))
        .limit(40),
    ]);
    return {
      query: q,
      users: userRows.map(toAuthor),
      posts: postRows.map(toFeedPost),
    };
  }

  const needle = q.toLowerCase();
  const users = [...mem().authorsByHandle.values()].filter(
    (u) =>
      u.handle.toLowerCase().includes(needle) ||
      u.displayName.toLowerCase().includes(needle) ||
      u.bio.toLowerCase().includes(needle),
  );
  const posts = mem()
    .ordered.filter((p) => p.body.toLowerCase().includes(needle))
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, 40);
  return { query: q, users, posts };
}

// Create a post (requires DB). Returns the new post id.
export async function createPost(input: {
  authorId: string;
  body: string;
  mediaUrl?: string | null;
  parentId?: string | null;
}): Promise<string | null> {
  if (!hasDatabase) return null;
  const [row] = await db
    .insert(postsTable)
    .values({
      authorId: input.authorId,
      body: input.body,
      mediaUrl: input.mediaUrl ?? null,
      parentId: input.parentId ?? null,
    })
    .returning({ id: postsTable.id });
  if (input.parentId) {
    await db
      .update(postsTable)
      .set({ replyCount: sql`${postsTable.replyCount} + 1` })
      .where(eq(postsTable.id, input.parentId));
  }
  return row?.id ?? null;
}

export function stats() {
  if (hasDatabase) return null; // computed live in DB mode
  const m = mem();
  return {
    users: m.authorsByHandle.size,
    posts: m.posts.size,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Likes / reposts. The viewer's account row is resolved read-only here (no
// account is created just from viewing a page — only from a write action).
// ─────────────────────────────────────────────────────────────────────────

export async function getViewerId(email: string | null | undefined): Promise<string | null> {
  if (!email || !hasDatabase) return null;
  const handle = handleFromEmail(email);
  const rows = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.handle, handle))
    .limit(1);
  return rows[0]?.id ?? null;
}

// Stamps likedByMe/repostedByMe onto a batch of posts for a given viewer.
// No-op (all false) when signed out, in memory mode, or the post list is empty.
export async function withViewerState(
  posts: FeedPost[],
  viewerId: string | null,
): Promise<FeedPost[]> {
  if (!viewerId || !hasDatabase || posts.length === 0) return posts;
  const ids = posts.map((p) => p.id);
  const [likedRows, repostedRows] = await Promise.all([
    db
      .select({ postId: likesTable.postId })
      .from(likesTable)
      .where(and(eq(likesTable.userId, viewerId), inArray(likesTable.postId, ids))),
    db
      .select({ postId: repostsTable.postId })
      .from(repostsTable)
      .where(and(eq(repostsTable.userId, viewerId), inArray(repostsTable.postId, ids))),
  ]);
  const liked = new Set(likedRows.map((r) => r.postId));
  const reposted = new Set(repostedRows.map((r) => r.postId));
  return posts.map((p) => ({
    ...p,
    likedByMe: liked.has(p.id),
    repostedByMe: reposted.has(p.id),
  }));
}

export async function toggleLike(
  userId: string,
  postId: string,
): Promise<{ liked: boolean; likeCount: number } | null> {
  if (!hasDatabase) return null;
  return db.transaction(async (tx) => {
    // Lock the post row first. Any concurrent toggleLike on the same post
    // (same user double-clicking, or two tabs) blocks here until this
    // transaction commits — that's what closes the check-then-act race,
    // not the transaction wrapper by itself.
    const [locked] = await tx
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .for("update");
    if (!locked) return null;

    const existing = await tx
      .select({ userId: likesTable.userId })
      .from(likesTable)
      .where(and(eq(likesTable.userId, userId), eq(likesTable.postId, postId)))
      .limit(1);

    if (existing[0]) {
      await tx
        .delete(likesTable)
        .where(and(eq(likesTable.userId, userId), eq(likesTable.postId, postId)));
      const [row] = await tx
        .update(postsTable)
        .set({ likeCount: sql`greatest(${postsTable.likeCount} - 1, 0)` })
        .where(eq(postsTable.id, postId))
        .returning({ likeCount: postsTable.likeCount });
      return { liked: false, likeCount: row?.likeCount ?? 0 };
    }

    await tx.insert(likesTable).values({ userId, postId }).onConflictDoNothing();
    const [row] = await tx
      .update(postsTable)
      .set({ likeCount: sql`${postsTable.likeCount} + 1` })
      .where(eq(postsTable.id, postId))
      .returning({ likeCount: postsTable.likeCount });
    return { liked: true, likeCount: row?.likeCount ?? 0 };
  });
}

export async function toggleRepost(
  userId: string,
  postId: string,
): Promise<{ reposted: boolean; repostCount: number } | null> {
  if (!hasDatabase) return null;
  return db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .for("update");
    if (!locked) return null;

    const existing = await tx
      .select({ userId: repostsTable.userId })
      .from(repostsTable)
      .where(and(eq(repostsTable.userId, userId), eq(repostsTable.postId, postId)))
      .limit(1);

    if (existing[0]) {
      await tx
        .delete(repostsTable)
        .where(and(eq(repostsTable.userId, userId), eq(repostsTable.postId, postId)));
      const [row] = await tx
        .update(postsTable)
        .set({ repostCount: sql`greatest(${postsTable.repostCount} - 1, 0)` })
        .where(eq(postsTable.id, postId))
        .returning({ repostCount: postsTable.repostCount });
      return { reposted: false, repostCount: row?.repostCount ?? 0 };
    }

    await tx.insert(repostsTable).values({ userId, postId }).onConflictDoNothing();
    const [row] = await tx
      .update(postsTable)
      .set({ repostCount: sql`${postsTable.repostCount} + 1` })
      .where(eq(postsTable.id, postId))
      .returning({ repostCount: postsTable.repostCount });
    return { reposted: true, repostCount: row?.repostCount ?? 0 };
  });
}
