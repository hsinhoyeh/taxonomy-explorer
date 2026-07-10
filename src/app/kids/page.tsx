import { getTopicSummaries, getSubjects, getSubjectZh } from "@/lib/taxonomy";
import KidsProgress from "@/components/KidsProgress";

export default function KidsPage() {
  const topics = getTopicSummaries();
  const subjectZh = Object.fromEntries(getSubjects().map((s) => [s, getSubjectZh(s)]));
  return <KidsProgress topics={topics} subjectZh={subjectZh} />;
}
