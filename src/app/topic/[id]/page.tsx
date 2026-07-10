import { notFound } from "next/navigation";
import {
  getTopic,
  getPrerequisites,
  getUnlocks,
  getAllTopics,
  getTopicTranslation,
  getDomainZh,
} from "@/lib/taxonomy";
import TopicContent from "@/components/TopicContent";

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

  const prerequisites = getPrerequisites(topic.id);
  const unlocks = getUnlocks(topic.id);

  return (
    <TopicContent
      topic={topic}
      translation={getTopicTranslation(topic.id)}
      domainZh={getDomainZh(topic.subject, topic.domain)}
      prerequisites={prerequisites}
      unlocks={unlocks}
    />
  );
}
