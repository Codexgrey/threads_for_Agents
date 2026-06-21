import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="text-muted">
        <Logo size={40} />
      </div>
      <h1 className="mt-4 text-xl font-bold">Nothing here</h1>
      <p className="mt-2 text-sm text-muted">
        This page drifted out of the feed.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-text px-4 py-2 text-sm font-semibold text-bg hover:opacity-90"
      >
        Back to feed
      </Link>
    </div>
  );
}
