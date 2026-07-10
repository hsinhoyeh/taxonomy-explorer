"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useChildName, fillPrompt } from "@/lib/useChildName";
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
  const [name] = useChildName();
  const { lang, t } = useLang();
  const storageKey = `taxonomy-explorer:evidence:${topicId}`;
  const [checked, setChecked] = useState<boolean[]>(() => evidence.map(() => false));

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === evidence.length) {
          setChecked(parsed);
        }
      } catch {
        // ignore malformed cache
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const toggle = (i: number) => {
    const next = checked.map((v, idx) => (idx === i ? !v : v));
    setChecked(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const doneCount = checked.filter(Boolean).length;
  const allDone = doneCount === evidence.length;
  const items = lang === "zh-tw" && evidenceZh ? evidenceZh : evidence;
  const prompt = fillPrompt(lang === "zh-tw" && assessmentPromptZh ? assessmentPromptZh : assessmentPrompt, name);

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
