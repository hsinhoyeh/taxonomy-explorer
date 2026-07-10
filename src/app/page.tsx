import Link from "next/link";
import { getAllTopics, getSubjects } from "@/lib/taxonomy";
import { getSubjectStyle } from "@/lib/subjectStyle";

export default function HomePage() {
  const subjects = getSubjects();
  const topics = getAllTopics();
  const countBySubject = new Map<string, number>();
  for (const t of topics) {
    countBySubject.set(t.subject, (countBySubject.get(t.subject) ?? 0) + 1);
  }

  return (
    <main className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-slate-800">
          What are we learning today? 🌟
        </h1>
        <p className="text-slate-500 mt-2">
          Pick a subject to explore what your child can discover next.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {subjects.map((subject) => {
          const style = getSubjectStyle(subject);
          return (
            <Link
              key={subject}
              href={`/subject/${encodeURIComponent(subject)}`}
              className={`rounded-3xl p-6 flex flex-col items-center justify-center gap-2 text-white bg-gradient-to-br ${style.gradient} shadow-md hover:scale-105 transition`}
            >
              <span className="text-4xl">{style.emoji}</span>
              <span className="font-bold text-center">{subject}</span>
              <span className="text-xs text-white/80">
                {countBySubject.get(subject)} topics
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
