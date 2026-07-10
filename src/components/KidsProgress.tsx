"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useProfiles } from "@/lib/profiles";
import { computeSubjectProgress, type SubjectProgress, type TopicSummary } from "@/lib/progress";
import { useLang } from "@/lib/i18n";
import SubjectBarChart from "@/components/SubjectBarChart";

export default function KidsProgress({
  topics,
  subjectZh,
}: {
  topics: TopicSummary[];
  subjectZh: Record<string, string | undefined>;
}) {
  const { profiles, activeProfile, switchProfile, ready } = useProfiles();
  const { t } = useLang();
  const [progress, setProgress] = useState<SubjectProgress[]>([]);

  useEffect(() => {
    if (!activeProfile) {
      setProgress([]);
      return;
    }
    setProgress(computeSubjectProgress(activeProfile.id, activeProfile.age, topics));
  }, [activeProfile, topics]);

  if (!ready) return null;

  return (
    <main className="flex-1 max-w-2xl mx-auto px-6 py-10 w-full">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800">{t("progressMapTitle")}</h1>
        <p className="text-slate-500 mt-1">{t("progressMapSubtitle")}</p>
      </motion.div>

      {profiles.length === 0 ? (
        <p className="text-slate-400 italic">{t("noProfiles")}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => switchProfile(p.id)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold border transition ${
                  activeProfile?.id === p.id
                    ? "border-transparent text-white"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
                style={activeProfile?.id === p.id ? { backgroundColor: p.color } : undefined}
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
              </button>
            ))}
          </div>

          {activeProfile && <SubjectBarChart data={progress} subjectZh={subjectZh} />}
        </>
      )}
    </main>
  );
}
