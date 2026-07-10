"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Topic, TopicTranslation } from "@/lib/types";
import { getSubjectStyle } from "@/lib/subjectStyle";
import TopicCard from "@/components/TopicCard";
import { Bilingual } from "@/components/Bilingual";
import { useLang } from "@/lib/i18n";

interface DomainEntry {
  domain: string;
  domainZh?: string;
  summary?: string;
  summaryZh?: string;
  topics: { topic: Topic; translation?: TopicTranslation }[];
}

export default function SubjectContent({
  subject,
  subjectZh,
  domains,
}: {
  subject: string;
  subjectZh?: string;
  domains: DomainEntry[];
}) {
  const style = getSubjectStyle(subject);
  const { t } = useLang();

  return (
    <main className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
        ← {t("allSubjects")}
      </Link>
      <h1 className={`text-3xl font-extrabold mt-2 mb-8 ${style.text}`}>
        {style.emoji} <Bilingual en={subject} zh={subjectZh} />
      </h1>

      <div className="space-y-10">
        {domains.map(({ domain, domainZh, summary, summaryZh, topics }, i) => (
          <motion.section
            key={domain}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: Math.min(i, 4) * 0.05 }}
          >
            <h2 className="text-xl font-bold text-slate-800 mb-1">
              <Bilingual en={domain} zh={domainZh} />
            </h2>
            {summary && (
              <p className="text-sm text-slate-500 mb-4 max-w-2xl">
                <Bilingual en={summary} zh={summaryZh} />
              </p>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topics.map(({ topic, translation }) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  translation={translation}
                  domainZh={domainZh}
                />
              ))}
            </div>
          </motion.section>
        ))}
      </div>
    </main>
  );
}
