import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Auth is optional for the live preview: reads stay fully public. We only
// register the Google provider when its credentials are present, so the app
// builds and runs even before OAuth is configured. "Sign up with Gmail"
// (Req 3) lights up the moment AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET are set.
const googleConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

export const isAuthConfigured = googleConfigured;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  // A fallback keeps public reads quiet when AUTH_SECRET isn't set (no real
  // sessions are issued without a provider anyway). Always set AUTH_SECRET in
  // production — it's what signs the session JWTs once Google sign-in is live.
  secret:
    process.env.AUTH_SECRET ||
    "dev-insecure-secret-please-set-AUTH_SECRET-in-production",
  providers: googleConfigured
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
      ]
    : [],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
});
