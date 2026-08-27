"use client";
import { useId } from "react";
import { motion } from "framer-motion";
import { attributionsOf, formatPp, type Assessment, type Factor } from "@/lib/contract";
import { useMeasuredWidth } from "@/lib/useMeasuredWidth";
import { truncate } from "@/lib/utils";


const RESIDUAL_FACTOR: Factor = {
  name: "Unexplained",
  value: "",
  category: "biomarker",
  direction: "up",
  importance: 0,
  impact:
    "Gap between the predicted risk and the sum of the listed contributions. The model's own numbers do not fully add up.",
};

export function RiskWaterfall({ assessment }: { assessment: Assessment }) {
  const uid = useId().replace(/[«»:]/g, "");
  const { ref, width } = useMeasuredWidth<HTMLDivElement>(600);
  const { base, risk: final, items, residual, exact } = attributionsOf(assessment);

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No factors to display.</p>;
  }

  const ordered = [...items].sort((a, b) => Math.abs(b.phi) - Math.abs(a.phi));
  const contributions = exact
    ? ordered
    : [...ordered, { factor: RESIDUAL_FACTOR, phi: residual }];

  let cum = base;
  const steps = contributions.map(({ factor, phi }) => {
    const from = cum;
    cum += phi;
    return { f: factor, delta: phi, from, to: cum };
  });

  const scale = steps.map((s) => s.delta);

  const W = Math.max(260, Math.round(width));
  const compact = W < 460;
  const labelW = compact ? 92 : 168;
  const rowH = compact ? 34 : 38;
  const barH = compact ? 20 : 22;
  const topPad = 8;
  const axisH = 28;
  const n = steps.length;
  const H = topPad + (n + 2) * rowH + axisH;

  const values = [0, base, final, ...steps.flatMap((s) => [s.from, s.to])];
  const minV = Math.min(0, ...values);
  const maxV = Math.max(...values) * 1.12 + 0.01;
  const x = (v: number) => labelW + ((v - minV) / (maxV - minV)) * (W - labelW - 16);

  const tickStep =
    [0.01, 0.02, 0.05, 0.1, 0.2].find((s) => (maxV - minV) / s <= 6) ?? 0.2;
  const ticks: number[] = [];
  for (let t = Math.ceil(minV / tickStep) * tickStep; t <= maxV; t += tickStep) ticks.push(t);

  const rowY = (i: number) => topPad + i * rowH + (rowH - barH) / 2;
  const axisTop = topPad + (n + 2) * rowH;

  return (
    <div ref={ref}>
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className="block max-w-full"
      role="img"
      aria-label={`Waterfall from baseline ${(base * 100).toFixed(0)}% to risk score ${assessment.riskScore}`}
    >
      <defs>
        <linearGradient id={`${uid}-up`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--risk-up)" stopOpacity="0.72" />
          <stop offset="1" stopColor="var(--risk-up)" />
        </linearGradient>
        <linearGradient id={`${uid}-down`} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="var(--risk-down)" stopOpacity="0.72" />
          <stop offset="1" stopColor="var(--risk-down)" />
        </linearGradient>
        <linearGradient id={`${uid}-final`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--brand-ink)" stopOpacity="0.72" />
          <stop offset="1" stopColor="var(--brand-ink)" />
        </linearGradient>
      </defs>

      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={x(t)} y1={topPad} x2={x(t)} y2={axisTop - 4}
            stroke="color-mix(in srgb, var(--foreground) 8%, transparent)" strokeWidth="1"
          />
          <text x={x(t)} y={axisTop + 14} textAnchor="middle" fontSize="10"
                fill="var(--muted-foreground)">
            {(t * 100).toFixed(0)}%
          </text>
        </g>
      ))}

      <g>
        <text x={labelW - 12} y={rowY(0) + barH / 2 + 4} textAnchor="end" fontSize="12.5"
              fill="var(--muted-foreground)">
          Base rate
        </text>
        <rect x={x(Math.min(0, base))} y={rowY(0)}
              width={Math.max(Math.abs(x(base) - x(0)), 3)} height={barH} rx="6"
              fill="color-mix(in srgb, var(--foreground) 22%, transparent)" />
        <text x={x(base) + 7} y={rowY(0) + barH / 2 + 4} fontSize="11" fontWeight="600"
              fill="var(--muted-foreground)" className="tabular-nums">
          {(base * 100).toFixed(0)}%
        </text>
      </g>

      {steps.map((s, i) => {
        const up = s.delta >= 0;
        const y = rowY(i + 1);
        const bx = Math.min(x(s.from), x(s.to));
        const bw = Math.max(Math.abs(x(s.to) - x(s.from)), 3);
        const color = up ? "var(--risk-up)" : "var(--risk-down)";
        return (
          <g key={`${s.f.name}-${i}`} tabIndex={0} className="outline-none focus-visible:opacity-80">
            <title>{s.f.impact}</title>
            <text x={labelW - 12} y={y + barH / 2 + 4} textAnchor="end" fontSize="12.5"
                  fill="color-mix(in srgb, var(--foreground) 78%, transparent)">
              {truncate(s.f.name, compact ? 11 : 22)}
            </text>
            <line x1={x(s.from)} y1={y - rowH + barH} x2={x(s.from)} y2={y + barH}
                  stroke="color-mix(in srgb, var(--foreground) 14%, transparent)" strokeWidth="1" />
            <motion.rect
              y={y} height={barH} rx="6"
              fill={`url(#${uid}-${up ? "up" : "down"})`}
              initial={{ width: 0, x: x(s.from) }}
              animate={{ width: bw, x: bx }}
              transition={{ duration: 0.5, delay: 0.08 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.text
              x={up ? x(s.to) + 7 : x(s.to) - 7} y={y + barH / 2 + 4}
              textAnchor={up ? "start" : "end"} fontSize="11.5" fontWeight="600" fill={color}
              className="tabular-nums"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.05 }}
            >
              {up ? "+" : "−"}{formatPp(s.delta, scale)}
            </motion.text>
          </g>
        );
      })}

      <g>
        <line x1={x(final)} y1={rowY(n) + barH} x2={x(final)} y2={rowY(n + 1) + barH}
              stroke="color-mix(in srgb, var(--foreground) 14%, transparent)" strokeWidth="1" />
        <text x={labelW - 12} y={rowY(n + 1) + barH / 2 + 4} textAnchor="end"
              fontSize={compact ? 12 : 13}
              fontWeight="700" fill="var(--foreground)">
          {compact ? "Predicted" : "Predicted risk"}
        </text>
        <motion.rect
          y={rowY(n + 1)} height={barH} rx="6"
          fill={`url(#${uid}-final)`}
          initial={{ width: 0, x: x(0) }}
          animate={{ width: Math.max(Math.abs(x(final) - x(0)), 3), x: x(Math.min(0, final)) }}
          transition={{ duration: 0.6, delay: 0.15 + n * 0.05, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.text
          x={x(final) + 7} y={rowY(n + 1) + barH / 2 + 4} fontSize="12.5" fontWeight="700"
          fill="var(--brand-ink)" className="font-mono tabular-nums"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.4 + n * 0.05 }}
        >
          {assessment.riskScore}
        </motion.text>
      </g>
    </svg>
    </div>
  );
}
