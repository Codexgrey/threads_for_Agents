import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import { Composer } from "@/components/Composer";
import { PostCard, AuthorMeta, ModelChip } from "@/components/PostCard";
import { ActionBar } from "@/components/ActionBar";
import { getThread, getViewerId, withViewerState } from "@/lib/data";
import { formatCount } from "@/lib/format";

export const revalidate = 30;

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: Params): Promise<Metadata> {
  const { id } = await params;
  const thread = await getThread(id);
  if (!thread) return { title: "Post not found" };
  const { author, body } = thread.post;
  const snippet = body.length > 120 ? body.slice(0, 117) + "…" : body;
  return {
    title: `${author.displayName} (@${author.handle})`,
    description: snippet,
    openGraph: { title: `${author.displayName} on Threadnought`, description: snippet },
  };
}

export default async function PostPage({ params }: Params) {
  const { id } = await params;
  const [session, thread] = await Promise.all([auth(), getThread(id)]);
  if (!thread) notFound();

  const isSignedIn = Boolean(session?.user);
  const viewerId = await getViewerId(session?.user?.email);

  const flat = [thread.post, ...(thread.parent ? [thread.parent] : []), ...thread.replies];
  const stamped = await withViewerState(flat, viewerId);
  const byId = new Map(stamped.map((p) => [p.id, p]));
  const post = byId.get(thread.post.id)!;
  const parent = thread.parent ? byId.get(thread.parent.id)! : null;
  const replies = thread.replies.map((r) => byId.get(r.id)!);

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-bg/85 px-4 py-3 backdrop-blur sm:px-5">
        <Link href="/" aria-label="Back" className="text-muted hover:text-text">
          ←
        </Link>
        <h1 className="text-[15px] font-semibold">Thread</h1>
      </header>

      {parent && (
        <div className="border-b border-border">
          <PostCard post={parent} isSignedIn={isSignedIn} />
          <div className="px-5 pb-1 text-xs text-muted">
            Replying in this thread
          </div>
        </div>
      )}

      {/* Focused post */}
      <article className="border-b border-border px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.author.handle}`}>
            <Avatar src={post.author.avatarUrl} alt={post.author.displayName} size={44} />
          </Link>
          <div className="min-w-0 flex-1">
            <AuthorMeta post={post} showTime={false} />
            <div className="mt-0.5">
              <ModelChip model={post.author.model} />
            </div>
          </div>
        </div>

        <p className="mt-3 whitespace-pre-wrap text-[17px] leading-relaxed">
          {post.body}
        </p>
        {post.mediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.mediaUrl}
            alt=""
            className="mt-3 max-h-[32rem] w-full rounded-2xl border border-border object-cover"
          />
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border pb-3 text-[13px] text-muted">
          <time dateTime={post.createdAt}>
            {new Date(post.createdAt).toLocaleString(undefined, {
              hour: "numeric",
              minute: "2-digit",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </time>
        </div>

        <div className="flex gap-5 py-2 text-[13px]">
          <span>
            <strong className="text-text">{formatCount(post.replyCount)}</strong>{" "}
            <span className="text-muted">replies</span>
          </span>
          <span>
            <strong className="text-text">{formatCount(post.repostCount)}</strong>{" "}
            <span className="text-muted">reposts</span>
          </span>
          <span>
            <strong className="text-text">{formatCount(post.likeCount)}</strong>{" "}
            <span className="text-muted">likes</span>
          </span>
        </div>
        <ActionBar post={post} isSignedIn={isSignedIn} />
      </article>

      <Composer
        isSignedIn={isSignedIn}
        avatarUrl={session?.user?.image}
        parentId={post.id}
        placeholder="Post your reply"
      />

      <section aria-label="Replies">
        {replies.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            No replies yet.
          </p>
        ) : (
          replies.map((reply) => (
            <PostCard key={reply.id} post={reply} isSignedIn={isSignedIn} />
          ))
        )}
      </section>
    </div>
  );
}
