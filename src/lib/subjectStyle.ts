export interface SubjectStyle {
  emoji: string;
  gradient: string;
  ring: string;
  text: string;
}

const styles: Record<string, SubjectStyle> = {
  Science: {
    emoji: "🔬",
    gradient: "from-emerald-400 to-teal-500",
    ring: "ring-emerald-300",
    text: "text-emerald-700",
  },
  Mathematics: {
    emoji: "🔢",
    gradient: "from-blue-400 to-indigo-500",
    ring: "ring-blue-300",
    text: "text-blue-700",
  },
  English: {
    emoji: "📚",
    gradient: "from-rose-400 to-pink-500",
    ring: "ring-rose-300",
    text: "text-rose-700",
  },
  History: {
    emoji: "🏛️",
    gradient: "from-amber-400 to-orange-500",
    ring: "ring-amber-300",
    text: "text-amber-700",
  },
  "Personal & Social Development": {
    emoji: "🤝",
    gradient: "from-fuchsia-400 to-purple-500",
    ring: "ring-fuchsia-300",
    text: "text-fuchsia-700",
  },
  "Life Skills": {
    emoji: "🧰",
    gradient: "from-lime-400 to-green-500",
    ring: "ring-lime-300",
    text: "text-lime-700",
  },
  Computing: {
    emoji: "💻",
    gradient: "from-cyan-400 to-sky-500",
    ring: "ring-cyan-300",
    text: "text-cyan-700",
  },
  "Learning to Learn": {
    emoji: "🧠",
    gradient: "from-violet-400 to-purple-500",
    ring: "ring-violet-300",
    text: "text-violet-700",
  },
};

const fallback: SubjectStyle = {
  emoji: "✨",
  gradient: "from-slate-400 to-slate-500",
  ring: "ring-slate-300",
  text: "text-slate-700",
};

export function getSubjectStyle(subject: string): SubjectStyle {
  return styles[subject] ?? fallback;
}
