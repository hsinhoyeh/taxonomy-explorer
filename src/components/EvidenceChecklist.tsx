"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useProfiles, evidenceStorageKey, fillPrompt } from "@/lib/profiles";
import { useLang } from "@/lib/i18n";
import { ZhuyinText } from "@/components/Bilingual";

export default function EvidenceChecklist({
  topicId,
  evidence,
  evidenceZh,
  assessmentPrompt,
  assessmentPromptZh,
}: {
  topicId: string;
  evidence: string[];
  evidenceZh?: string[];
  assessmentPrompt: string;
  assessmentPromptZh?: string;
}) {
  const { activeProfile, ready } = useProfiles();
  const { lang, t } = useLang();
  const storageKey = activeProfile ? evidenceStorageKey(activeProfile.id, topicId) : null;
  const [checked, setChecked] = useState<boolean[]>(() => evidence.map(() => false));

  useEffect(() => {
    if (!storageKey) {
      setChecked(evidence.map(() => false));
      return;
    }
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === evidence.length) {
          setChecked(parsed);
          return;
        }
      } catch {
        // ignore malformed cache
      }
    }
    setChecked(evidence.map(() => false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const toggle = (i: number) => {
    if (!storageKey) return;
    setChecked((prev) => {
      const next = prev.map((v, idx) => (idx === i ? !v : v));
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const doneCount = checked.filter(Boolean).length;
  const allDone = doneCount === evidence.length;
  const items = lang === "zh-tw" && evidenceZh ? evidenceZh : evidence;
  const prompt = fillPrompt(
    lang === "zh-tw" && assessmentPromptZh ? assessmentPromptZh : assessmentPrompt,
    activeProfile?.name ?? ""
  );

  if (ready && !activeProfile) {
    return (
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 text-amber-800 text-sm">
        {t("noProfileYet")}
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl bg-white shadow-sm border border-slate-200 p-5 overflow-hidden">
      <p className="text-sm font-semibold text-slate-500 mb-2">
        {doneCount} / {evidence.length} {t("mastered")}
      </p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i}>
            <motion.button
              type="button"
              onClick={() => toggle(i)}
              whileTap={{ scale: 0.97 }}
              animate={checked[i] ? { scale: [1, 1.03, 1] } : { scale: 1 }}
              transition={{ duration: 0.25 }}
              className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                checked[i]
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="mr-2">{checked[i] ? "✅" : "⬜"}</span>
              {lang === "zh-tw" && evidenceZh ? <ZhuyinText text={item} /> : item}
            </motion.button>
          </li>
        ))}
      </ul>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-5 mb-1">
        {t("tryAsking")}
      </p>
      <p className="text-slate-600 italic">
        &ldquo;{lang === "zh-tw" && assessmentPromptZh ? <ZhuyinText text={prompt} /> : prompt}&rdquo;
      </p>
      <AnimatePresence>
        {allDone && (
          <motion.div
            key="celebrate"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-center text-lg font-bold text-emerald-600"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.5 }}
              className="inline-block"
            >
              {t("allDone")}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
