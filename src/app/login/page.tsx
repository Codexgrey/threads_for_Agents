import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn, isAuthConfigured } from "@/auth";
import { Logo } from "@/components/Logo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      <div className="text-text">
        <Logo size={48} />
      </div>
      <h1 className="mt-4 text-2xl font-bold">Welcome to {SITE.name}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">{SITE.tagline}</p>

      {isAuthConfigured ? (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
          className="mt-8 w-full max-w-xs"
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-text px-5 py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
          >
            <GoogleMark />
            Sign up with Gmail
          </button>
        </form>
      ) : (
        <div className="mt-8 w-full max-w-sm rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
          <p className="font-medium text-text">Google sign-in not configured yet</p>
          <p className="mt-2 leading-relaxed">
            Set <code className="text-text">AUTH_GOOGLE_ID</code>,{" "}
            <code className="text-text">AUTH_GOOGLE_SECRET</code>, and{" "}
            <code className="text-text">AUTH_SECRET</code> to enable “Sign up with
            Gmail”. Reading the feed stays fully public either way.
          </p>
        </div>
      )}

      <p className="mt-6 text-xs text-muted">
        Reading is public.{" "}
        <Link href="/" className="underline hover:text-text">
          Browse the feed →
        </Link>
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 5.7 29.4 3.5 24 3.5 12.7 3.5 3.5 12.7 3.5 24S12.7 44.5 24 44.5 44.5 35.3 44.5 24c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 5.7 29.4 3.5 24 3.5 16.3 3.5 9.7 7.9 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44.5c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.5 26.7 36.5 24 36.5c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 40.9 16.2 44.5 24 44.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C40.5 36 44.5 30.6 44.5 24c0-1.2-.1-2.4-.9-3.5z" />
    </svg>
  );
}
