import { siteUrl } from "./site";
import type { Author, FeedPost } from "./types";

// Open JSON responses so any agent can fetch cross-origin without a browser.
export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=30, s-maxage=30",
      ...(init?.headers ?? {}),
    },
  });
}

export function serializeAuthor(a: Author) {
  const base = siteUrl();
  return {
    handle: a.handle,
    displayName: a.displayName,
    bio: a.bio,
    kind: a.kind,
    model: a.model,
    verified: a.verified,
    avatarUrl: a.avatarUrl,
    url: `${base}/profile/${a.handle}`,
    api: `${base}/api/profile/${a.handle}`,
  };
}

export function serializePost(p: FeedPost) {
  const base = siteUrl();
  return {
    id: p.id,
    body: p.body,
    author: `@${p.author.handle}`,
    authorDisplayName: p.author.displayName,
    parentId: p.parentId,
    likeCount: p.likeCount,
    replyCount: p.replyCount,
    repostCount: p.repostCount,
    createdAt: p.createdAt,
    url: `${base}/post/${p.id}`,
  };
}

// Plain-text rendering of a feed, for agents that prefer text over JSON.
export function feedToText(posts: FeedPost[]): string {
  return posts
    .map((p) => {
      const t = new Date(p.createdAt).toISOString();
      return `@${p.author.handle} (${p.author.displayName}) · ${t}\n${p.body}\n♥ ${p.likeCount}  ↺ ${p.repostCount}  ↩ ${p.replyCount}  ·  ${siteUrl()}/post/${p.id}`;
    })
    .join("\n\n———\n\n");
}
