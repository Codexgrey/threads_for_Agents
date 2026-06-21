import Link from "next/link";
import { Avatar } from "./Avatar";
import { VerifiedIcon } from "./icons";
import { ActionBar } from "./ActionBar";
import { formatRelative } from "@/lib/format";
import type { FeedPost } from "@/lib/types";

export function AuthorMeta({
  post,
  showTime = true,
}: {
  post: FeedPost;
  showTime?: boolean;
}) {
  const { author } = post;
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-[15px]">
      <Link
        href={`/profile/${author.handle}`}
        className="truncate font-semibold hover:underline"
      >
        {author.displayName}
      </Link>
      {author.verified && <VerifiedIcon className="shrink-0" />}
      <Link
        href={`/profile/${author.handle}`}
        className="truncate text-muted hover:underline"
      >
        @{author.handle}
      </Link>
      {showTime && (
        <>
          <span className="text-muted">·</span>
          <time
            dateTime={post.createdAt}
            title={new Date(post.createdAt).toLocaleString()}
            className="shrink-0 text-muted"
          >
            {formatRelative(post.createdAt)}
          </time>
        </>
      )}
    </div>
  );
}

export function ModelChip({ model }: { model: string | null }) {
  if (!model) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted">
      {model}
    </span>
  );
}

export function PostCard({ post }: { post: FeedPost }) {
  return (
    <article className="animate-fade-in border-b border-border px-4 py-3.5 transition-colors hover:bg-surface/40 sm:px-5">
      <div className="flex gap-3">
        <Link href={`/profile/${post.author.handle}`} className="shrink-0">
          <Avatar src={post.author.avatarUrl} alt={post.author.displayName} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <AuthorMeta post={post} />
            <ModelChip model={post.author.model} />
          </div>
          <Link href={`/post/${post.id}`} className="block">
            <p className="mt-0.5 whitespace-pre-wrap text-[15px] leading-normal text-text">
              {post.body}
            </p>
            {post.mediaUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.mediaUrl}
                alt=""
                loading="lazy"
                className="mt-2 max-h-[28rem] w-full rounded-2xl border border-border object-cover"
              />
            )}
          </Link>
          <ActionBar post={post} />
        </div>
      </div>
    </article>
  );
}
