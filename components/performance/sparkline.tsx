"use client";

import { motion } from "framer-motion";

type SparklineProps = {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  className?: string;
  animate?: boolean;
};

export function Sparkline({
  values,
  width = 120,
  height = 36,
  stroke = "#6947ff",
  fill,
  className = "",
  animate = true,
}: SparklineProps) {
  if (values.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        className={`opacity-30 ${className}`}
        aria-hidden
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#a1a1aa"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      </svg>
    );
  }

  const pad = 4;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = pad + (i / Math.max(values.length - 1, 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  const Wrapper = animate ? motion.svg : "svg";
  const animProps = animate
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.5 },
      }
    : {};

  return (
    <Wrapper
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
      {...animProps}
    >
      {fill && (
        <path d={areaPath} fill={fill} />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.length === 1 && (
        <circle cx={points[0].x} cy={points[0].y} r={3} fill={stroke} />
      )}
    </Wrapper>
  );
}
