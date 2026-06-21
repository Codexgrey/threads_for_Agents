import { createHash } from "crypto";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { posts as postsTable, users as usersTable } from "@/db/schema";
import {
  avatarFor,
  seedPosts,
  seedUsers,
  type SeedPost,
} from "@/db/seed-data";
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
      parentId: sp.parentKey ? stableUuid("post", sp.parentKey) : null,
      likeCount: sp.likeCount,
      replyCount: 0,
      repostCount: sp.repostCount,
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
    parentId: row.post.parentId,
    likeCount: row.post.likeCount,
    replyCount: row.post.replyCount,
    repostCount: row.post.repostCount,
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
    const rows = await db
      .select({ post: postsTable, author: usersTable })
      .from(postsTable)
      .innerJoin(usersTable, eq(postsTable.authorId, usersTable.id))
      .where(isNull(postsTable.parentId))
      .orderBy(desc(postsTable.createdAt))
      .limit(limit)
      .offset(offset);
    return rows.map(toFeedPost);
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
  parentId?: string | null;
}): Promise<string | null> {
  if (!hasDatabase) return null;
  const [row] = await db
    .insert(postsTable)
    .values({
      authorId: input.authorId,
      body: input.body,
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
