"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { RelatedTopic } from "@/lib/taxonomy";
import { Bilingual } from "@/components/Bilingual";
import { useLang, type StringKey } from "@/lib/i18n";

export default function RelatedTopicList({
  titleKey,
  items,
  emptyKey,
}: {
  titleKey: StringKey;
  items: RelatedTopic[];
  emptyKey: StringKey;
}) {
  const { t } = useLang();
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">
        {t(titleKey)}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 italic">{t(emptyKey)}</p>
      ) : (
        <ul className="space-y-2">
          {items.map(({ topic, topicNameZh, strength, reason, reasonZh }, i) => (
            <motion.li
              key={topic.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                href={`/topic/${topic.id}`}
                className="block rounded-xl border border-slate-200 bg-white px-4 py-2 hover:bg-slate-50 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    <Bilingual en={topic.name} zh={topicNameZh} />
                  </span>
                  {strength === "hard" && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">
                      {t("required")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  <Bilingual en={reason} zh={reasonZh} />
                </p>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
