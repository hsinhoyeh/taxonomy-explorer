"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { RelatedTopic } from "@/lib/taxonomy";
import { getSubjectStyle } from "@/lib/subjectStyle";
import { Bilingual } from "@/components/Bilingual";

const MAX_SIDE = 5;
const WIDTH = 720;
const HEIGHT = 360;
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };
const NODE_R = 8;

function sideNodes(items: RelatedTopic[], x: number) {
  const shown = items.slice(0, MAX_SIDE);
  const n = shown.length;
  return shown.map((item, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const y = 40 + t * (HEIGHT - 80);
    return { item, x, y };
  });
}

export default function PrereqGraph({
  currentSubject,
  prerequisites,
  unlocks,
}: {
  currentSubject: string;
  prerequisites: RelatedTopic[];
  unlocks: RelatedTopic[];
}) {
  const router = useRouter();
  const style = getSubjectStyle(currentSubject);
  const left = sideNodes(prerequisites, 90);
  const right = sideNodes(unlocks, WIDTH - 90);
  const extraLeft = prerequisites.length - left.length;
  const extraRight = unlocks.length - right.length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full min-w-[560px]"
        style={{ height: HEIGHT }}
      >
        {left.map(({ x, y }, i) => (
          <motion.line
            key={`l-line-${i}`}
            x1={x}
            y1={y}
            x2={CENTER.x}
            y2={CENTER.y}
            stroke="#cbd5e1"
            strokeWidth={1.5}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
          />
        ))}
        {right.map(({ x, y }, i) => (
          <motion.line
            key={`r-line-${i}`}
            x1={CENTER.x}
            y1={CENTER.y}
            x2={x}
            y2={y}
            stroke="#cbd5e1"
            strokeWidth={1.5}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
          />
        ))}

        {left.map(({ item, x, y }, i) => (
          <motion.g
            key={item.topic.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            className="cursor-pointer"
            onClick={() => router.push(`/topic/${item.topic.id}`)}
          >
            <circle cx={x} cy={y} r={NODE_R} fill="#94a3b8" />
            <text
              x={x}
              y={y - 14}
              textAnchor="middle"
              className="fill-slate-600 text-[10px] font-medium"
            >
              <Bilingual en={truncate(item.topic.name)} zh={item.topicNameZh ? truncate(item.topicNameZh) : undefined} />
            </text>
          </motion.g>
        ))}

        {right.map(({ item, x, y }, i) => (
          <motion.g
            key={item.topic.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            className="cursor-pointer"
            onClick={() => router.push(`/topic/${item.topic.id}`)}
          >
            <circle cx={x} cy={y} r={NODE_R} fill={style.dot ?? "#6366f1"} />
            <text
              x={x}
              y={y - 14}
              textAnchor="middle"
              className="fill-slate-600 text-[10px] font-medium"
            >
              <Bilingual en={truncate(item.topic.name)} zh={item.topicNameZh ? truncate(item.topicNameZh) : undefined} />
            </text>
          </motion.g>
        ))}

        <motion.circle
          cx={CENTER.x}
          cy={CENTER.y}
          r={NODE_R + 6}
          fill="url(#center-gradient)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
        />
        <defs>
          <linearGradient id="center-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex justify-between text-[11px] text-slate-400 px-4 -mt-2">
        <span>{extraLeft > 0 ? `+${extraLeft} more` : ""}</span>
        <span>{extraRight > 0 ? `+${extraRight} more` : ""}</span>
      </div>
    </div>
  );
}

function truncate(s: string, max = 12): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}
