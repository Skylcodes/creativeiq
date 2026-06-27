"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatAnalysisDateTime } from "@/lib/analyses/utils";
import { getReportScoreColor } from "@/lib/report/utils";
import type { PerformanceAnalysisPoint } from "@/lib/performance/types";

type ScoreTrendChartProps = {
  points: PerformanceAnalysisPoint[];
  averageScore: number | null;
};

const CHART_W = 800;
const CHART_H = 280;
const PAD = { top: 24, right: 24, bottom: 40, left: 44 };

export function ScoreTrendChart({ points, averageScore }: ScoreTrendChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const plot = useMemo(() => {
    if (points.length === 0) return null;

    const innerW = CHART_W - PAD.left - PAD.right;
    const innerH = CHART_H - PAD.top - PAD.bottom;

    const coords = points.map((p, i) => {
      const x =
        PAD.left +
        (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
      const y = PAD.top + (1 - p.score / 100) * innerH;
      return { x, y, point: p, index: i };
    });

    const linePath = coords
      .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
      .join(" ");

    const areaPath =
      linePath +
      ` L ${coords[coords.length - 1].x} ${CHART_H - PAD.bottom} L ${coords[0].x} ${CHART_H - PAD.bottom} Z`;

    const avgY =
      averageScore !== null
        ? PAD.top + (1 - averageScore / 100) * innerH
        : null;

    return { coords, linePath, areaPath, avgY, innerH };
  }, [points, averageScore]);

  if (!plot || points.length === 0) return null;

  const hoveredCoord = hovered !== null ? plot.coords[hovered] : null;

  return (
    <div className="relative w-full">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full h-auto"
          role="img"
          aria-label="Score trend over time"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const y = PAD.top + (1 - tick / 100) * plot.innerH;
            return (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  y1={y}
                  x2={CHART_W - PAD.right}
                  y2={y}
                  stroke="rgba(0,0,0,0.04)"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-text-muted text-[10px]"
                  fontSize={10}
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Average reference line */}
          {plot.avgY !== null && averageScore !== null && (
            <>
              <line
                x1={PAD.left}
                y1={plot.avgY}
                x2={CHART_W - PAD.right}
                y2={plot.avgY}
                stroke="#6947ff"
                strokeWidth={1}
                strokeDasharray="6 4"
                opacity={0.45}
              />
              <text
                x={CHART_W - PAD.right}
                y={plot.avgY - 6}
                textAnchor="end"
                fill="#6947ff"
                fontSize={10}
                opacity={0.7}
              >
                Avg {averageScore}
              </text>
            </>
          )}

          {/* Area fill */}
          <motion.path
            d={plot.areaPath}
            fill="url(#scoreGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          />

          {/* Line */}
          <motion.path
            d={plot.linePath}
            fill="none"
            stroke="#6947ff"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Data points */}
          {plot.coords.map(({ x, y, point, index }) => (
            <g key={point.id}>
              <circle
                cx={x}
                cy={y}
                r={14}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              />
              <motion.circle
                cx={x}
                cy={y}
                r={point.isComparison ? 7 : 5}
                fill={point.isComparison ? "#3b2b9f" : getReportScoreColor(point.score)}
                stroke="white"
                strokeWidth={2}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + index * 0.04 }}
              />
              {point.isComparison && (
                <circle
                  cx={x}
                  cy={y}
                  r={10}
                  fill="none"
                  stroke="#3b2b9f"
                  strokeWidth={1.5}
                  opacity={0.4}
                />
              )}
            </g>
          ))}

          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(94, 80, 235, 0.18)" />
              <stop offset="100%" stopColor="rgba(94, 80, 235, 0.02)" />
            </linearGradient>
          </defs>
        </svg>

        {/* Tooltip */}
        {hoveredCoord && (
          <div
            className="pointer-events-none absolute z-10 max-w-[240px] premium-card-glass px-4 py-3 shadow-[var(--shadow-soft)]"
            style={{
              left: `${(hoveredCoord.x / CHART_W) * 100}%`,
              top: `${(hoveredCoord.y / CHART_H) * 100 - 8}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="truncate text-sm font-semibold text-text-primary">
              {hoveredCoord.point.title}
              {hoveredCoord.point.isComparison && (
                <span className="ml-1.5 text-[10px] font-medium text-[#3b2b9f]">
                  Comparison
                </span>
              )}
            </p>
            <p className="mt-0.5 text-[11px] text-text-muted">
              {formatAnalysisDateTime(hoveredCoord.point.date)}
            </p>
            <p
              className="mt-1 font-display text-lg font-bold"
              style={{ color: getReportScoreColor(hoveredCoord.point.score) }}
            >
              {hoveredCoord.point.score}/100
            </p>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary">
              {hoveredCoord.point.verdict}
            </p>
          </div>
        )}
      </motion.div>

      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" />
          Funnel analysis
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-[#3b2b9f] bg-[#3b2b9f]/30" />
          Variant comparison (winner score)
        </span>
      </div>
    </div>
  );
}
