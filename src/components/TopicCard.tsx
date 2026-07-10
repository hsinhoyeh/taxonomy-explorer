"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Topic, TopicTranslation } from "@/lib/types";
import { getSubjectStyle } from "@/lib/subjectStyle";
import { Bilingual } from "@/components/Bilingual";
import { useLang } from "@/lib/i18n";

export default function TopicCard({
  topic,
  translation,
  domainZh,
}: {
  topic: Topic;
  translation?: TopicTranslation;
  domainZh?: string;
}) {
  const style = getSubjectStyle(topic.subject);
  const { t } = useLang();
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Link
        href={`/topic/${topic.id}`}
        className={`block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow ring-1 ring-transparent hover:${style.ring}`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-slate-400">
            {t("typicalAge")} {topic.ageRangeStart}–{topic.ageRangeEnd} {t("years")}
          </span>
          <span className="text-xs text-slate-400">
            <Bilingual en={topic.domain} zh={domainZh} />
          </span>
        </div>
        <h3 className="text-lg font-bold text-slate-800">
          <Bilingual en={topic.name} zh={translation?.name} />
        </h3>
        <p className="text-sm text-slate-500 line-clamp-2 mt-1">
          <Bilingual en={topic.description} zh={translation?.description} />
        </p>
      </Link>
    </motion.div>
  );
}
