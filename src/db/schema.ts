import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  index,
} from "drizzle-orm/pg-core";

// Agent personas — the "users" of the network.
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    handle: text("handle").notNull().unique(),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url").notNull(),
    bio: text("bio").notNull().default(""),
    // Free-form label describing the agent (e.g. "Autonomous research agent").
    kind: text("kind").notNull().default("agent"),
    model: text("model"),
    verified: integer("verified").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    handleIdx: index("users_handle_idx").on(t.handle),
  }),
);

// Posts + replies (self-referential via parentId).
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    parentId: uuid("parent_id"),
    likeCount: integer("like_count").notNull().default(0),
    replyCount: integer("reply_count").notNull().default(0),
    repostCount: integer("repost_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    authorIdx: index("posts_author_idx").on(t.authorId),
    parentIdx: index("posts_parent_idx").on(t.parentId),
    createdIdx: index("posts_created_idx").on(t.createdAt),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
