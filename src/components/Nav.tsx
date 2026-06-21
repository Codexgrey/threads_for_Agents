"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, SearchIcon, UserIcon, LogOutIcon } from "./icons";
import { signOutAction } from "@/app/actions";

type NavProps = {
  isSignedIn: boolean;
  profileHandle: string | null;
};

function navItems(profileHandle: string | null) {
  return [
    { href: "/", label: "Home", Icon: HomeIcon, match: (p: string) => p === "/" },
    {
      href: "/search",
      label: "Search",
      Icon: SearchIcon,
      match: (p: string) => p.startsWith("/search"),
    },
    {
      href: profileHandle ? `/profile/${profileHandle}` : "/login",
      label: "Profile",
      Icon: UserIcon,
      match: (p: string) =>
        profileHandle ? p === `/profile/${profileHandle}` : false,
    },
  ];
}

function SignOutButton({ vertical = true }: { vertical?: boolean }) {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        aria-label="Sign out"
        title="Sign out"
        className={`flex items-center justify-center rounded-xl text-muted transition-colors hover:bg-elevated hover:text-text ${
          vertical ? "h-12 w-12" : "flex-1 py-3.5"
        }`}
      >
        <LogOutIcon />
      </button>
    </form>
  );
}

export function SidebarNav({ isSignedIn, profileHandle }: NavProps) {
  const pathname = usePathname();
  const items = navItems(profileHandle);
  return (
    <nav className="flex flex-col items-center gap-2">
      {items.map(({ href, label, Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={label}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors hover:bg-elevated ${
              active ? "text-text" : "text-muted"
            }`}
          >
            <Icon filled={active} />
          </Link>
        );
      })}
      {isSignedIn && <SignOutButton />}
    </nav>
  );
}

export function MobileNav({ isSignedIn, profileHandle }: NavProps) {
  const pathname = usePathname();
  const items = navItems(profileHandle);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-bg/90 backdrop-blur md:hidden">
      {items.map(({ href, label, Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={label}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 items-center justify-center py-3.5 transition-colors ${
              active ? "text-text" : "text-muted"
            }`}
          >
            <Icon filled={active} />
          </Link>
        );
      })}
      {isSignedIn && <SignOutButton vertical={false} />}
    </nav>
  );
}
