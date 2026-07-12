"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useProfiles, evidenceStorageKey } from "@/lib/profiles";
import { getMastered } from "@/lib/mastery";
import { SYNC_APPLIED_EVENT } from "@/lib/sync";
import { computeSubjectProgress, type SubjectProgress, type TopicSummary } from "@/lib/progress";
import { useLang } from "@/lib/i18n";
import { getSubjectStyle } from "@/lib/subjectStyle";
import { Bilingual } from "@/components/Bilingual";
import SubjectBarChart from "@/components/SubjectBarChart";
import TrajectoryChart, { type TrajectoryPoint } from "@/components/TrajectoryChart";

interface Milestone {
  topic: TopicSummary;
  time: number;
}

interface Trajectory {
  points: TrajectoryPoint[];
  baseline: number;
  recent: Milestone[];
}

const DAY = 24 * 60 * 60 * 1000;

function isFullyChecked(profileId: string, topic: TopicSummary): boolean {
  const raw = window.localStorage.getItem(evidenceStorageKey(profileId, topic.id));
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length === topic.evidenceCount && parsed.every(Boolean);
  } catch {
    return false;
  }
}

function computeTrajectory(profileId: string, topics: TopicSummary[]): Trajectory {
  const byId = new Map(topics.map((t) => [t.id, t]));
  const mastered = getMastered(profileId);
  const stamped = Object.entries(mastered)
    .filter(([topicId]) => byId.has(topicId))
    .sort((a, b) => a[1] - b[1]);

  // Topics mastered before timestamps existed form the chart's starting level.
  const stampedIds = new Set(stamped.map(([id]) => id));
  const baseline = topics.filter(
    (t) => !stampedIds.has(t.id) && isFullyChecked(profileId, t)
  ).length;

  // One point per day (cumulative), ending today.
  const points: TrajectoryPoint[] = [];
  let count = baseline;
  for (const [, ts] of stamped) {
    count += 1;
    const day = Math.floor(ts / DAY) * DAY;
    const last = points[points.length - 1];
    if (last && last.time === day) last.count = count;
    else points.push({ time: day, count });
  }
  if (points.length > 0) {
    const today = Math.floor(Date.now() / DAY) * DAY;
    const last = points[points.length - 1];
    if (last.time < today) points.push({ time: today, count: last.count });
  }

  const recent = stamped
    .slice(-8)
    .reverse()
    .map(([topicId, time]) => ({ topic: byId.get(topicId)!, time }));

  return { points, baseline, recent };
}

export default function KidsProgress({
  topics,
  subjectZh,
}: {
  topics: TopicSummary[];
  subjectZh: Record<string, string | undefined>;
}) {
  const { profiles, activeProfile, switchProfile, ready } = useProfiles();
  const { t, lang } = useLang();
  const [progress, setProgress] = useState<SubjectProgress[]>([]);
  const [trajectory, setTrajectory] = useState<Trajectory | null>(null);

  const recompute = useCallback(() => {
    if (!activeProfile) {
      setProgress([]);
      setTrajectory(null);
      return;
    }
    setProgress(computeSubjectProgress(activeProfile.id, activeProfile.age, topics));
    setTrajectory(computeTrajectory(activeProfile.id, topics));
  }, [activeProfile, topics]);

  useEffect(() => {
    recompute();
    window.addEventListener(SYNC_APPLIED_EVENT, recompute);
    return () => window.removeEventListener(SYNC_APPLIED_EVENT, recompute);
  }, [recompute]);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(lang === "zh-tw" ? "zh-TW" : "en-US", {
        month: "short",
        day: "numeric",
      }),
    [lang]
  );

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

          {activeProfile && trajectory && (
            <section className="mt-8">
              <h2 className="text-xl font-bold text-slate-800 mb-1">{t("trajectoryTitle")}</h2>
              {trajectory.points.length === 0 ? (
                <p className="text-sm text-slate-400 italic mt-2">{t("trajectoryEmpty")}</p>
              ) : (
                <>
                  {trajectory.baseline > 0 && (
                    <p className="text-xs text-slate-400 mb-2">
                      {t("trajectoryBaseline").replace("{n}", String(trajectory.baseline))}
                    </p>
                  )}
                  <div className="mt-2">
                    <TrajectoryChart points={trajectory.points} baseline={trajectory.baseline} />
                  </div>
                  <ul className="mt-4 space-y-2">
                    {trajectory.recent.map(({ topic, time }) => {
                      const style = getSubjectStyle(topic.subject);
                      return (
                        <li key={topic.id}>
                          <Link
                            href={`/topic/${topic.id}`}
                            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 hover:bg-slate-50 transition"
                          >
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: style.dot }}
                            />
                            <span className="flex-1 font-medium text-slate-700 truncate">
                              <Bilingual en={topic.name} zh={topic.nameZh} />
                            </span>
                            <span className="text-xs text-slate-400 shrink-0">
                              🏅 {dateFmt.format(time)}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
