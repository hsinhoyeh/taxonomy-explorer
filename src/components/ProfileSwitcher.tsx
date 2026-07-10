"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useProfiles } from "@/lib/profiles";
import { useLang } from "@/lib/i18n";

export default function ProfileSwitcher() {
  const { profiles, activeProfile, addProfile, switchProfile, deleteProfile, ready } = useProfiles();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState(7);

  if (!ready) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addProfile(name.trim(), age);
    setName("");
    setAge(7);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-semibold text-white"
      >
        {activeProfile ? (
          <>
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: activeProfile.color }}
            />
            {activeProfile.name}
          </>
        ) : (
          t("addChild")
        )}
        <span className="text-white/60">▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-lg border border-slate-200 p-3 z-50 text-slate-800"
          >
            {profiles.length > 0 && (
              <ul className="space-y-1 mb-3">
                {profiles.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        switchProfile(p.id);
                        setOpen(false);
                      }}
                      className={`flex-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50 ${
                        activeProfile?.id === p.id ? "bg-slate-100 font-semibold" : ""
                      }`}
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      {p.name}
                      <span className="text-xs text-slate-400">
                        · {p.age} {t("years")}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteProfile(p.id)}
                      className="text-slate-300 hover:text-rose-500 px-1"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={submit} className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("childName")}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                min={3}
                max={15}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-14 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg bg-indigo-500 text-white px-3 py-1.5 text-sm font-semibold hover:bg-indigo-600"
              >
                +
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
