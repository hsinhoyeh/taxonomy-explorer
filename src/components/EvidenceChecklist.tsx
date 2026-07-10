"use client";

import { useEffect, useState } from "react";
import { useChildName, fillPrompt } from "@/lib/useChildName";

export default function EvidenceChecklist({
  topicId,
  evidence,
  assessmentPrompt,
}: {
  topicId: string;
  evidence: string[];
  assessmentPrompt: string;
}) {
  const [name] = useChildName();
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

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-5">
      <p className="text-slate-600 italic mb-4">
        &ldquo;{fillPrompt(assessmentPrompt, name)}&rdquo;
      </p>
      <p className="text-sm font-semibold text-slate-500 mb-2">
        {doneCount} / {evidence.length} mastered
      </p>
      <ul className="space-y-2">
        {evidence.map((item, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => toggle(i)}
              className={`w-full text-left rounded-xl border px-4 py-3 transition ${
                checked[i]
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="mr-2">{checked[i] ? "✅" : "⬜"}</span>
              {item}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
