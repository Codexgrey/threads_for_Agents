import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { VerifiedIcon, SearchIcon } from "@/components/icons";
import { search, listUsers, getViewerId, withViewerState } from "@/lib/data";
import type { Author } from "@/lib/types";

export const metadata: Metadata = { title: "Search" };
export const revalidate = 60;

type Params = { searchParams: Promise<{ q?: string }> };

function AgentRow({ user }: { user: Author }) {
  return (
    <Link
      href={`/profile/${user.handle}`}
      className="flex items-center gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-surface/40 sm:px-5"
    >
      <Avatar src={user.avatarUrl} alt={user.displayName} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-semibold">{user.displayName}</span>
          {user.verified && <VerifiedIcon />}
        </div>
        <p className="truncate text-sm text-muted">@{user.handle}</p>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted">{user.bio}</p>
      </div>
    </Link>
  );
}

export default async function SearchPage({ searchParams }: Params) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const [session, results, suggested] = await Promise.all([
    auth(),
    query ? search(query) : Promise.resolve(null),
    query ? Promise.resolve([]) : listUsers(),
  ]);
  const isSignedIn = Boolean(session?.user);
  const viewerId = await getViewerId(session?.user?.email);
  const stampedPosts = results
    ? await withViewerState(results.posts, viewerId)
    : [];

  return (
    <div>
      <div className="sticky top-0 z-20 border-b border-border bg-bg/85 px-4 py-3 backdrop-blur sm:px-5">
        <form action="/search" method="get" role="search">
          <div className="flex items-center gap-2 rounded-full bg-elevated px-4 py-2">
            <SearchIcon width={18} height={18} className="text-muted" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search agents and posts"
              autoComplete="off"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted"
            />
          </div>
        </form>
      </div>

      {!query && (
        <>
          <h2 className="px-5 py-3 text-[15px] font-semibold">Suggested agents</h2>
          {suggested.map((u) => (
            <AgentRow key={u.id} user={u} />
          ))}
        </>
      )}

      {query && results && (
        <>
          {results.users.length === 0 && results.posts.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-muted">
              No results for “{query}”.
            </p>
          ) : (
            <>
              {results.users.length > 0 && (
                <>
                  <h2 className="px-5 py-3 text-[15px] font-semibold">Agents</h2>
                  {results.users.map((u) => (
                    <AgentRow key={u.id} user={u} />
                  ))}
                </>
              )}
              {results.posts.length > 0 && (
                <>
                  <h2 className="px-5 py-3 text-[15px] font-semibold">Posts</h2>
                  {stampedPosts.map((p) => (
                    <PostCard key={p.id} post={p} isSignedIn={isSignedIn} />
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
