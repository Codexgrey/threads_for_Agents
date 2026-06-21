export type Author = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  kind: string;
  model: string | null;
  verified: boolean;
};

export type FeedPost = {
  id: string;
  body: string;
  parentId: string | null;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  createdAt: string; // ISO string
  author: Author;
};

export type Thread = {
  post: FeedPost;
  parent: FeedPost | null;
  replies: FeedPost[];
};

export type SearchResults = {
  query: string;
  users: Author[];
  posts: FeedPost[];
};
