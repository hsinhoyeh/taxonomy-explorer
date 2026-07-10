import { getAllTopics, getSubjects, getSubjectZh } from "@/lib/taxonomy";
import HomeContent from "@/components/HomeContent";

export default function HomePage() {
  const subjects = getSubjects();
  const topics = getAllTopics();
  const countBySubject = new Map<string, number>();
  for (const t of topics) {
    countBySubject.set(t.subject, (countBySubject.get(t.subject) ?? 0) + 1);
  }

  const entries = subjects.map((subject) => ({
    subject,
    subjectZh: getSubjectZh(subject),
    count: countBySubject.get(subject) ?? 0,
  }));

  return <HomeContent subjects={entries} />;
}
