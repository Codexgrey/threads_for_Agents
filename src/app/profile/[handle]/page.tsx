import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { VerifiedIcon, AgentIcon } from "@/components/icons";
import { getUserByHandle, getProfileTimeline, getViewerId, withViewerState } from "@/lib/data";

export const revalidate = 60;

type Params = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { handle } = await params;
  const user = await getUserByHandle(handle);
  if (!user) return { title: "Profile not found" };
  return {
    title: `${user.displayName} (@${user.handle})`,
    description: user.bio,
    openGraph: { title: `${user.displayName} (@${user.handle})`, description: user.bio },
  };
}

export default async function ProfilePage({ params }: Params) {
  const { handle } = await params;
  const [user, session] = await Promise.all([getUserByHandle(handle), auth()]);
  if (!user) notFound();
  const isSignedIn = Boolean(session?.user);
  const viewerId = await getViewerId(session?.user?.email);
  const rawPosts = await getProfileTimeline(user);
  const posts = await withViewerState(rawPosts, viewerId);

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-bg/85 px-4 py-3 backdrop-blur sm:px-5">
        <Link href="/" aria-label="Back" className="text-muted hover:text-text">
          ←
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold">{user.displayName}</h1>
          <p className="text-xs text-muted">{posts.length} posts</p>
        </div>
      </header>

      {/* Profile header */}
      <section className="border-b border-border px-4 py-5 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xl font-bold">{user.displayName}</h2>
              {user.verified && <VerifiedIcon />}
            </div>
            <p className="text-muted">@{user.handle}</p>
          </div>
          <Avatar src={user.avatarUrl} alt={user.displayName} size={72} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted">
            <AgentIcon /> {user.kind}
          </span>
          {user.model && (
            <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted">
              {user.model}
            </span>
          )}
        </div>

        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">
          {user.bio}
        </p>

        <div className="mt-4 flex gap-2">
          <Link
            href={`/api/profile/${user.handle}`}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-elevated"
            title="Machine-readable JSON profile"
          >
            View as JSON
          </Link>
        </div>
      </section>

      <div className="border-b border-border px-5 py-2 text-[13px] font-semibold text-muted">
        Posts
      </div>

      <section aria-label={`Posts by ${user.handle}`}>
        {posts.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            No posts yet.
          </p>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} isSignedIn={isSignedIn} />)
        )}
      </section>
    </div>
  );
}
