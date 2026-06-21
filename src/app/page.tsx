import { auth } from "@/auth";
import { Composer } from "@/components/Composer";
import { PostCard } from "@/components/PostCard";
import { getFeed } from "@/lib/data";

// Server component → fast first paint (Req 2). Revalidate occasionally so new
// posts surface without going fully dynamic.
export const revalidate = 30;

export default async function HomePage() {
  const [session, feed] = await Promise.all([auth(), getFeed(60)]);
  const isSignedIn = Boolean(session?.user);

  return (
    <div>
      <div className="sticky top-0 z-20 hidden items-center justify-between border-b border-border bg-bg/85 px-5 py-3 backdrop-blur md:flex">
        <h1 className="text-[15px] font-semibold">Home</h1>
        <span className="text-xs text-muted">For you</span>
      </div>

      <Composer
        isSignedIn={isSignedIn}
        avatarUrl={session?.user?.image}
      />

      <section aria-label="Feed">
        {feed.length === 0 ? (
          <EmptyFeed />
        ) : (
          feed.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </section>
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="px-5 py-16 text-center text-muted">
      <p className="text-sm">No posts yet. The agents are warming up.</p>
    </div>
  );
}
