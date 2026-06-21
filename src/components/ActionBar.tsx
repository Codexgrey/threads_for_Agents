"use client";

import { useState, useTransition, type MouseEvent } from "react";
import Link from "next/link";
import { HeartIcon, ReplyIcon, RepostIcon, ShareIcon } from "./icons";
import { formatCount } from "@/lib/format";
import { toggleLikeAction, toggleRepostAction } from "@/app/actions";
import type { FeedPost } from "@/lib/types";

export function ActionBar({
  post,
  isSignedIn,
}: {
  post: FeedPost;
  isSignedIn: boolean;
}) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likes, setLikes] = useState(post.likeCount);
  const [reposted, setReposted] = useState(post.repostedByMe);
  const [reposts, setReposts] = useState(post.repostCount);
  const [notice, setNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function flash(message: string) {
    setNotice(message);
    setTimeout(() => setNotice((n) => (n === message ? null : n)), 2500);
  }

  function toggleLike(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isSignedIn) return flash("Sign in to like posts.");

    const next = !liked;
    setLiked(next);
    setLikes((n) => (next ? n + 1 : n - 1));
    startTransition(async () => {
      const result = await toggleLikeAction(post.id);
      if (!result.ok) {
        setLiked(!next);
        setLikes((n) => (next ? n - 1 : n + 1));
        flash(result.message ?? "Something went wrong.");
      } else {
        setLiked(result.liked!);
        setLikes(result.count!);
      }
    });
  }

  function toggleRepost(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isSignedIn) return flash("Sign in to repost.");

    const next = !reposted;
    setReposted(next);
    setReposts((n) => (next ? n + 1 : n - 1));
    startTransition(async () => {
      const result = await toggleRepostAction(post.id);
      if (!result.ok) {
        setReposted(!next);
        setReposts((n) => (next ? n - 1 : n + 1));
        flash(result.message ?? "Something went wrong.");
      } else {
        setReposted(result.reposted!);
        setReposts(result.count!);
      }
    });
  }

  return (
    <div className="-ml-2 mt-2 flex flex-wrap items-center gap-1 text-muted">
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

      <button
        onClick={toggleRepost}
        aria-pressed={reposted}
        aria-label="Repost"
        className={`group flex items-center gap-1 rounded-full px-2 py-1.5 text-[13px] transition-colors hover:bg-elevated ${
          reposted ? "text-emerald-500" : "hover:text-text"
        }`}
      >
        <RepostIcon />
        <span className="tabular-nums">{formatCount(reposts)}</span>
      </button>

      <span className="ml-auto flex items-center gap-1 rounded-full px-2 py-1.5 text-[13px] transition-colors hover:bg-elevated hover:text-text">
        <ShareIcon />
      </span>

      {notice && (
        <span className="basis-full text-xs text-amber-500">{notice}</span>
      )}
    </div>
  );
}
