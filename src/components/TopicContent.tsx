"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Topic, TopicTranslation } from "@/lib/types";
import type { RelatedTopic } from "@/lib/taxonomy";
import { getSubjectStyle } from "@/lib/subjectStyle";
import RelatedTopicList from "@/components/RelatedTopicList";
import EvidenceChecklist from "@/components/EvidenceChecklist";
import PrereqGraph from "@/components/PrereqGraph";
import { Bilingual } from "@/components/Bilingual";
import { useLang } from "@/lib/i18n";

export default function TopicContent({
  topic,
  translation,
  domainZh,
  prerequisites,
  unlocks,
}: {
  topic: Topic;
  translation?: TopicTranslation;
  domainZh?: string;
  prerequisites: RelatedTopic[];
  unlocks: RelatedTopic[];
}) {
  const style = getSubjectStyle(topic.subject);
  const { t } = useLang();
  const hasGraph = prerequisites.length > 0 || unlocks.length > 0;

  return (
    <main className="flex-1 max-w-3xl mx-auto px-6 py-10 w-full">
      <Link
        href={`/subject/${encodeURIComponent(topic.subject)}`}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← {topic.subject}
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 mb-6"
      >
        <span className={`inline-block text-xs font-bold uppercase tracking-wide ${style.text}`}>
          {style.emoji} {topic.subject} · <Bilingual en={topic.domain} zh={domainZh} />
        </span>
        <h1 className="text-3xl font-extrabold text-slate-800 mt-1">
          <Bilingual en={topic.name} zh={translation?.name} />
        </h1>
        <p className="text-slate-500 mt-2">
          <Bilingual en={topic.description} zh={translation?.description} />
        </p>
        <p className="text-xs text-slate-400 mt-2">
          {t("typicalAge")}: {topic.ageRangeStart}–{topic.ageRangeEnd} {t("years")}
        </p>
      </motion.div>

      <div className="mb-8">
        <EvidenceChecklist
          topicId={topic.id}
          evidence={topic.evidence}
          evidenceZh={translation?.evidence}
          assessmentPrompt={topic.assessmentPrompt}
          assessmentPromptZh={translation?.assessmentPrompt}
        />
      </div>

      {hasGraph && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">
            {t("exploreGraph")}
          </h2>
          <PrereqGraph
            currentSubject={topic.subject}
            prerequisites={prerequisites}
            unlocks={unlocks}
          />
        </motion.div>
      )}

      <div className="grid sm:grid-cols-2 gap-8">
        <RelatedTopicList
          titleKey="needsFirst"
          items={prerequisites}
          emptyKey="startingPoint"
        />
        <RelatedTopicList titleKey="unlocksNext" items={unlocks} emptyKey="noUnlocks" />
      </div>
    </main>
  );
}
