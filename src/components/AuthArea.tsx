"use client";

import { useEffect, useState } from "react";
import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { useLang } from "@/lib/i18n";
import { setSyncEnabled, initialSync } from "@/lib/sync";

function AuthControls() {
  const { data: session, status } = useSession();
  const { t } = useLang();
  const [open, setOpen] = useState(false);

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

  const firstName = session.user?.name?.split(" ")[0] ?? "";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-white/20 pl-1 pr-3 py-1 text-sm font-semibold text-white hover:bg-white/30"
      >
        {session.user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.user.image} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/30">👤</span>
        )}
        {firstName}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-lg border border-slate-200 p-3 z-50 text-slate-800"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              {session.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-xl">👤</span>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{session.user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{session.user?.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50"
            >
              {t("signOut")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Auth availability must be detected at runtime (via the providers
 * endpoint), not baked in at build time — static pages are prerendered
 * inside the Docker build where the OAuth env vars don't exist. */
export default function AuthArea() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((res) => (res.ok ? res.json() : null))
      .then((providers) => setEnabled(Boolean(providers?.google)))
      .catch(() => setEnabled(false));
  }, []);

  if (!enabled) return null;
  return (
    <SessionProvider>
      <AuthControls />
    </SessionProvider>
  );
}
