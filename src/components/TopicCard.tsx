import Link from "next/link";
import type { Topic } from "@/lib/types";
import { getSubjectStyle } from "@/lib/subjectStyle";

export default function TopicCard({ topic }: { topic: Topic }) {
  const style = getSubjectStyle(topic.subject);
  return (
    <Link
      href={`/topic/${topic.id}`}
      className={`block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition ring-1 ring-transparent hover:${style.ring}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-400">
          Ages {topic.ageRangeStart}–{topic.ageRangeEnd}
        </span>
        <span className="text-xs text-slate-400">{topic.domain}</span>
      </div>
      <h3 className="text-lg font-bold text-slate-800">{topic.name}</h3>
      <p className="text-sm text-slate-500 line-clamp-2 mt-1">{topic.description}</p>
    </Link>
  );
}
