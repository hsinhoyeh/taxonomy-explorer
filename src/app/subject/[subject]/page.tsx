import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSubjects,
  getDomains,
  getTopicsByDomain,
  getClusterSummary,
} from "@/lib/taxonomy";
import { getSubjectStyle } from "@/lib/subjectStyle";
import TopicCard from "@/components/TopicCard";

export function generateStaticParams() {
  return getSubjects().map((subject) => ({ subject: encodeURIComponent(subject) }));
}

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject: rawSubject } = await params;
  const subject = decodeURIComponent(rawSubject);
  const subjects = getSubjects();
  if (!subjects.includes(subject)) notFound();

  const style = getSubjectStyle(subject);
  const domains = getDomains(subject);

  return (
    <main className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
        ← All subjects
      </Link>
      <h1 className={`text-3xl font-extrabold mt-2 mb-8 ${style.text}`}>
        {style.emoji} {subject}
      </h1>

      <div className="space-y-10">
        {domains.map((domain) => {
          const topics = getTopicsByDomain(subject, domain);
          const summary = getClusterSummary(subject, domain, topics[0]?.ageRangeStart ?? 6);
          return (
            <section key={domain}>
              <h2 className="text-xl font-bold text-slate-800 mb-1">{domain}</h2>
              {summary && (
                <p className="text-sm text-slate-500 mb-4 max-w-2xl">{summary}</p>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {topics.map((topic) => (
                  <TopicCard key={topic.id} topic={topic} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
