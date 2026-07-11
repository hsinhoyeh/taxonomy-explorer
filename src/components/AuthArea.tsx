"use client";

import { useEffect } from "react";
import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";
import { useLang } from "@/lib/i18n";
import { setSyncEnabled, initialSync } from "@/lib/sync";

function AuthControls() {
  const { data: session, status } = useSession();
  const { t } = useLang();

  useEffect(() => {
    const authed = status === "authenticated";
    setSyncEnabled(authed);
    if (authed) void initialSync();
  }, [status]);

  if (status === "loading") return null;

  if (!session) {
    return (
      <button
        type="button"
        onClick={() => signIn("google")}
        className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold text-white hover:bg-white/30"
      >
        {t("signIn")}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => signOut()}
      title={session.user?.email ?? ""}
      className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-semibold text-white hover:bg-white/30"
    >
      {session.user?.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={session.user.image} alt="" className="h-5 w-5 rounded-full" />
      ) : (
        <span>👤</span>
      )}
      {t("signOut")}
    </button>
  );
}

/** Rendered only when Google OAuth credentials are configured (the server
 * layout passes `enabled`); until then the app stays anonymous-only. */
export default function AuthArea({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return (
    <SessionProvider>
      <AuthControls />
    </SessionProvider>
  );
}
