"use client";

import { motion } from "framer-motion";

export interface TrajectoryPoint {
  /** epoch ms (day resolution) */
  time: number;
  /** cumulative mastered count at this time */
  count: number;
}

const WIDTH = 560;
const HEIGHT = 180;
const PAD = { left: 34, right: 12, top: 10, bottom: 24 };

/** Cumulative mastered-topics-over-time line. Single series: no legend,
 * 2px round-capped line, hairline gridlines, end-dot with value label. */
export default function TrajectoryChart({
  points,
  baseline,
}: {
  points: TrajectoryPoint[];
  baseline: number;
}) {
  if (points.length === 0) return null;

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  const t0 = points[0].time;
  const t1 = Math.max(points[points.length - 1].time, t0 + 1);
  const yMax = Math.max(points[points.length - 1].count, baseline + 1);

  const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0)) * plotW;
  const y = (c: number) => PAD.top + plotH - (c / yMax) * plotH;

  // Step-after path: mastery is a discrete event, not an interpolation.
  let d = `M ${x(points[0].time)} ${y(baseline)}`;
  let prev = baseline;
  for (const p of points) {
    d += ` L ${x(p.time)} ${y(prev)} L ${x(p.time)} ${y(p.count)}`;
    prev = p.count;
  }
  d += ` L ${PAD.left + plotW} ${y(prev)}`;

  const yTicks = [0, Math.ceil(yMax / 2), yMax];
  const fmt = (t: number) =>
    new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const last = points[points.length - 1];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 overflow-x-auto">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full min-w-[420px]" style={{ height: HEIGHT }}>
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              y1={y(tick)}
              x2={WIDTH - PAD.right}
              y2={y(tick)}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <text x={PAD.left - 6} y={y(tick) + 3.5} textAnchor="end" className="fill-slate-400 text-[10px]">
              {tick}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={HEIGHT - 6} className="fill-slate-400 text-[10px]">
          {fmt(t0)}
        </text>
        <text x={WIDTH - PAD.right} y={HEIGHT - 6} textAnchor="end" className="fill-slate-400 text-[10px]">
          {fmt(t1)}
        </text>
        <motion.path
          d={d}
          fill="none"
          stroke="#6366f1"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8 }}
        />
        <circle cx={x(last.time)} cy={y(last.count)} r={4} fill="#6366f1" stroke="#ffffff" strokeWidth={2} />
        <text
          x={Math.min(x(last.time) + 8, WIDTH - PAD.right)}
          y={y(last.count) - 6}
          className="fill-slate-700 text-[11px] font-semibold"
        >
          {last.count}
        </text>
      </svg>
    </div>
  );
}
