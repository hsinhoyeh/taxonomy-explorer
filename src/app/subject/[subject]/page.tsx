import { notFound } from "next/navigation";
import {
  getSubjects,
  getDomains,
  getTopicsByDomain,
  getClusterSummary,
  getSubjectZh,
  getDomainZh,
  getTopicTranslation,
} from "@/lib/taxonomy";
import SubjectContent from "@/components/SubjectContent";

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

  const domains = getDomains(subject).map((domain) => {
    const topics = getTopicsByDomain(subject, domain);
    const clusterSummary = getClusterSummary(subject, domain, topics[0]?.ageRangeStart ?? 6);
    return {
      domain,
      domainZh: getDomainZh(subject, domain),
      summary: clusterSummary?.summary,
      summaryZh: clusterSummary?.summaryZh,
      topics: topics.map((topic) => ({
        topic,
        translation: getTopicTranslation(topic.id),
      })),
    };
  });

  return (
    <SubjectContent subject={subject} subjectZh={getSubjectZh(subject)} domains={domains} />
  );
}
