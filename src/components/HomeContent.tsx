"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { getSubjectStyle } from "@/lib/subjectStyle";
import { Bilingual } from "@/components/Bilingual";
import { useLang } from "@/lib/i18n";

interface SubjectEntry {
  subject: string;
  subjectZh?: string;
  count: number;
}

export default function HomeContent({ subjects }: { subjects: SubjectEntry[] }) {
  const { t } = useLang();
  return (
    <main className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <h1 className="text-4xl font-extrabold text-slate-800">{t("heroTitle")} 🌟</h1>
        <p className="text-slate-500 mt-2">{t("heroSubtitle")}</p>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {subjects.map(({ subject, subjectZh, count }, i) => {
          const style = getSubjectStyle(subject);
          return (
            <motion.div
              key={subject}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.06, rotate: [0, -1, 1, 0] }}
              whileTap={{ scale: 0.96 }}
            >
              <Link
                href={`/subject/${encodeURIComponent(subject)}`}
                className={`rounded-3xl p-6 flex flex-col items-center justify-center gap-2 text-white bg-gradient-to-br ${style.gradient} shadow-md`}
              >
                <span className="text-4xl">{style.emoji}</span>
                <span className="font-bold text-center">
                  <Bilingual en={subject} zh={subjectZh} />
                </span>
                <span className="text-xs text-white/80">
                  {count} {t("topicsCount")}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </main>
  );
}
