import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopic, getPrerequisites, getUnlocks, getAllTopics } from "@/lib/taxonomy";
import { getSubjectStyle } from "@/lib/subjectStyle";
import RelatedTopicList from "@/components/RelatedTopicList";
import EvidenceChecklist from "@/components/EvidenceChecklist";

export function generateStaticParams() {
  return getAllTopics().map((t) => ({ id: t.id }));
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const topic = getTopic(id);
  if (!topic) notFound();

  const style = getSubjectStyle(topic.subject);
  const prerequisites = getPrerequisites(topic.id);
  const unlocks = getUnlocks(topic.id);

  return (
    <main className="flex-1 max-w-3xl mx-auto px-6 py-10 w-full">
      <Link
        href={`/subject/${encodeURIComponent(topic.subject)}`}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        ← {topic.subject}
      </Link>

      <div className="mt-2 mb-6">
        <span className={`inline-block text-xs font-bold uppercase tracking-wide ${style.text}`}>
          {style.emoji} {topic.subject} · {topic.domain}
        </span>
        <h1 className="text-3xl font-extrabold text-slate-800 mt-1">{topic.name}</h1>
        <p className="text-slate-500 mt-2">{topic.description}</p>
        <p className="text-xs text-slate-400 mt-2">
          Typical age: {topic.ageRangeStart}–{topic.ageRangeEnd} years
        </p>
      </div>

      <div className="mb-8">
        <EvidenceChecklist
          topicId={topic.id}
          evidence={topic.evidence}
          assessmentPrompt={topic.assessmentPrompt}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-8">
        <RelatedTopicList
          title="Needs first"
          items={prerequisites}
          emptyLabel="Nothing — this is a great starting point!"
        />
        <RelatedTopicList
          title="Unlocks next"
          items={unlocks}
          emptyLabel="This doesn't unlock anything else yet."
        />
      </div>
    </main>
  );
}
