"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { SubjectProgress } from "@/lib/progress";
import { getSubjectStyle } from "@/lib/subjectStyle";
import { Bilingual } from "@/components/Bilingual";
import { useLang } from "@/lib/i18n";

const BAR_HEIGHT = 20;
const ROW_HEIGHT = 40;
const GRIDLINES = [0, 25, 50, 75, 100];

export default function SubjectBarChart({
  data,
  subjectZh,
}: {
  data: SubjectProgress[];
  subjectZh: Record<string, string | undefined>;
}) {
  const { t } = useLang();
  const [hovered, setHovered] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const chartWidth = 480;
  const labelWidth = 140;
  const plotWidth = chartWidth - labelWidth;
  const height = data.length * ROW_HEIGHT + 24;

  if (data.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${chartWidth} ${height}`} className="w-full min-w-[420px]" style={{ height }}>
          {GRIDLINES.map((g) => {
            const x = labelWidth + (g / 100) * plotWidth;
            return (
              <line
                key={g}
                x1={x}
                y1={4}
                x2={x}
                y2={height - 20}
                stroke="#e2e8f0"
                strokeWidth={1}
              />
            );
          })}
          {data.map((d, i) => {
            const style = getSubjectStyle(d.subject);
            const barW = (d.percent / 100) * plotWidth;
            const y = 12 + i * ROW_HEIGHT;
            return (
              <g key={d.subject} onMouseEnter={() => setHovered(d.subject)} onMouseLeave={() => setHovered(null)}>
                <text
                  x={labelWidth - 10}
                  y={y + BAR_HEIGHT / 2 + 4}
                  textAnchor="end"
                  className="fill-slate-600 text-[11px] font-medium"
                >
                  <Bilingual en={d.subject} zh={subjectZh[d.subject]} />
                </text>
                <rect
                  x={labelWidth}
                  y={y}
                  width={plotWidth}
                  height={BAR_HEIGHT}
                  fill="transparent"
                />
                <motion.rect
                  x={labelWidth}
                  y={y}
                  height={BAR_HEIGHT}
                  rx={4}
                  fill={style.dot}
                  initial={{ width: 0 }}
                  animate={{ width: Math.max(barW, 2) }}
                  transition={{ duration: 0.6, delay: i * 0.05 }}
                  opacity={hovered && hovered !== d.subject ? 0.5 : 1}
                />
                <text
                  x={labelWidth + barW + 8}
                  y={y + BAR_HEIGHT / 2 + 4}
                  className="fill-slate-700 text-[11px] font-semibold"
                >
                  {d.percent}%
                </text>
                {hovered === d.subject && (
                  <text
                    x={labelWidth}
                    y={y + BAR_HEIGHT + 14}
                    className="fill-slate-400 text-[10px]"
                  >
                    {d.mastered} {t("topicsOf")} {d.total} {t("topicsMastered")}
                  </text>
                )}
              </g>
            );
          })}
          <line
            x1={labelWidth}
            y1={height - 20}
            x2={chartWidth}
            y2={height - 20}
            stroke="#cbd5e1"
            strokeWidth={1}
          />
        </svg>
      </div>
      <button
        type="button"
        onClick={() => setShowTable((v) => !v)}
        className="mt-2 text-xs text-slate-400 underline"
      >
        {showTable ? "▲" : "▼"} table
      </button>
      {showTable && (
        <table className="mt-2 w-full text-sm">
          <tbody>
            {data.map((d) => (
              <tr key={d.subject} className="border-t border-slate-100">
                <td className="py-1.5 pr-2 text-slate-600">
                  <Bilingual en={d.subject} zh={subjectZh[d.subject]} />
                </td>
                <td className="py-1.5 text-right text-slate-500">
                  {d.mastered} / {d.total}
                </td>
                <td className="py-1.5 pl-2 text-right font-semibold text-slate-700 w-12">
                  {d.percent}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
