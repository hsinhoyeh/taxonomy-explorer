import Link from "next/link";
import type { RelatedTopic } from "@/lib/taxonomy";

export default function RelatedTopicList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: RelatedTopic[];
  emptyLabel: string;
}) {
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 italic">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {items.map(({ topic, strength, reason }) => (
            <li key={topic.id}>
              <Link
                href={`/topic/${topic.id}`}
                className="block rounded-xl border border-slate-200 bg-white px-4 py-2 hover:bg-slate-50 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{topic.name}</span>
                  {strength === "hard" && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">
                      REQUIRED
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{reason}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
