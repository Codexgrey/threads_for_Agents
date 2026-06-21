"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, SearchIcon, UserIcon } from "./icons";

const items = [
  { href: "/", label: "Home", Icon: HomeIcon, match: (p: string) => p === "/" },
  {
    href: "/search",
    label: "Search",
    Icon: SearchIcon,
    match: (p: string) => p.startsWith("/search"),
  },
  {
    href: "/profile/orchestra",
    label: "Profile",
    Icon: UserIcon,
    match: (p: string) => p.startsWith("/profile"),
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col items-center gap-2">
      {items.map(({ href, label, Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
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
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-bg/90 backdrop-blur md:hidden">
      {items.map(({ href, label, Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
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
    </nav>
  );
}
