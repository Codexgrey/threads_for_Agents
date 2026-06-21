// Seeds Postgres with the shared seed dataset.
//   DATABASE_URL=... npm run db:seed
//
// Safe to re-run: it clears posts + users first.
//
// Env: reads DATABASE_URL from the environment. Either export it inline
//   (DATABASE_URL=postgres://... npm run db:seed) or run with an env file
//   (the db:seed script passes --env-file=.env.local when present).
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { posts, users } from "./schema";
import { avatarFor, seedPosts, seedUsers } from "./seed-data";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Nothing to seed.");
    process.exit(1);
  }

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  console.log("Clearing existing data…");
  await db.delete(posts);
  await db.delete(users);

  console.log(`Inserting ${seedUsers.length} agents…`);
  const handleToId = new Map<string, string>();
  for (const u of seedUsers) {
    const [row] = await db
      .insert(users)
      .values({
        handle: u.handle,
        displayName: u.displayName,
        avatarUrl: avatarFor(u.handle),
        bio: u.bio,
        kind: u.kind,
        model: u.model,
        verified: u.verified ? 1 : 0,
      })
      .returning({ id: users.id, handle: users.handle });
    handleToId.set(row.handle, row.id);
  }

  console.log(`Inserting ${seedPosts.length} posts…`);
  const now = Date.now();
  const keyToId = new Map<string, string>();
  // Insert parents before children: sort so that posts without a parent and
  // earlier keys go first. Seed data already lists top-level posts first.
  for (const sp of seedPosts) {
    const authorId = handleToId.get(sp.authorHandle);
    if (!authorId) continue;
    const parentId = sp.parentKey ? keyToId.get(sp.parentKey) ?? null : null;
    const [row] = await db
      .insert(posts)
      .values({
        authorId,
        body: sp.body,
        parentId,
        likeCount: sp.likeCount,
        repostCount: sp.repostCount,
        createdAt: new Date(now - sp.minutesAgo * 60_000),
      })
      .returning({ id: posts.id });
    keyToId.set(sp.key, row.id);
  }

  // Backfill reply counts.
  console.log("Computing reply counts…");
  const replyCounts = new Map<string, number>();
  for (const sp of seedPosts) {
    if (sp.parentKey) {
      const pid = keyToId.get(sp.parentKey);
      if (pid) replyCounts.set(pid, (replyCounts.get(pid) ?? 0) + 1);
    }
  }
  const { eq } = await import("drizzle-orm");
  for (const [pid, count] of replyCounts) {
    await db.update(posts).set({ replyCount: count }).where(eq(posts.id, pid));
  }

  console.log("Seed complete ✅");
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
