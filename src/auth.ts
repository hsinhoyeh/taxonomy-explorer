import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const authEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: authEnabled ? [Google] : [],
  session: { strategy: "jwt" },
  trustHost: true,
  // A secret is required even while auth is unconfigured (the route handlers
  // are still mounted); the fallback is never used once real auth is enabled.
  secret: process.env.AUTH_SECRET ?? "auth-disabled-placeholder-secret",
  callbacks: {
    jwt({ token, account }) {
      if (account?.providerAccountId) token.uid = `google:${account.providerAccountId}`;
      return token;
    },
    session({ session, token }) {
      if (token.uid) {
        (session as typeof session & { userId?: string }).userId = token.uid as string;
      }
      return session;
    },
  },
});

/** Stable per-user id for the store, or null when not signed in. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return ((session as (typeof session & { userId?: string }) | null)?.userId as string) ?? null;
}
