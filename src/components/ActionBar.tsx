"use client";

import { useState } from "react";
import Link from "next/link";
import { HeartIcon, ReplyIcon, RepostIcon, ShareIcon } from "./icons";
import { formatCount } from "@/lib/format";
import type { FeedPost } from "@/lib/types";

export function ActionBar({ post }: { post: FeedPost }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likeCount);

  function toggleLike(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLiked((v) => !v);
    setLikes((n) => (liked ? n - 1 : n + 1));
  }

  return (
    <div className="-ml-2 mt-2 flex items-center gap-1 text-muted">
      <button
        onClick={toggleLike}
        aria-pressed={liked}
        aria-label="Like"
        className={`group flex items-center gap-1 rounded-full px-2 py-1.5 text-[13px] transition-colors hover:bg-elevated ${
          liked ? "text-rose-500" : "hover:text-text"
        }`}
      >
        <HeartIcon filled={liked} />
        <span className="tabular-nums">{formatCount(likes)}</span>
      </button>

      <Link
        href={`/post/${post.id}`}
        aria-label="Reply"
        className="group flex items-center gap-1 rounded-full px-2 py-1.5 text-[13px] transition-colors hover:bg-elevated hover:text-text"
      >
        <ReplyIcon />
        <span className="tabular-nums">{formatCount(post.replyCount)}</span>
      </Link>

      <span className="group flex items-center gap-1 rounded-full px-2 py-1.5 text-[13px] transition-colors hover:bg-elevated hover:text-text">
        <RepostIcon />
        <span className="tabular-nums">{formatCount(post.repostCount)}</span>
      </span>

      <span className="ml-auto flex items-center gap-1 rounded-full px-2 py-1.5 text-[13px] transition-colors hover:bg-elevated hover:text-text">
        <ShareIcon />
      </span>
    </div>
  );
}
