"use client";
import { useId } from "react";
import { motion } from "framer-motion";
import { signedValue, type Assessment } from "@/lib/contract";

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function RiskWaterfall({ assessment }: { assessment: Assessment }) {
  const uid = useId().replace(/[«»:]/g, "");
  const base = assessment.baseValue ?? 0.06;
  const parsedScore = parseFloat(assessment.riskScore);
  const final =
    assessment.riskValue ?? (Number.isFinite(parsedScore) ? parsedScore / 100 : base);

  const rows = [...assessment.factors].sort(
    (a, b) => Math.abs(signedValue(b)) - Math.abs(signedValue(a))
  );
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No factors to display.</p>;
  }

  const hasShap = rows.some((f) => typeof f.shapValue === "number");
  const rawSum = rows.reduce((s, f) => s + signedValue(f), 0);
  const scale = hasShap ? 1 : rawSum !== 0 ? (final - base) / rawSum : 0;

  let cum = base;
  const steps = rows.map((f) => {
    const delta = signedValue(f) * scale;
    const from = cum;
    cum += delta;
    return { f, delta, from, to: cum };
  });

  const W = 640;
  const labelW = 168;
  const rowH = 38;
  const barH = 22;
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
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
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
          <stop offset="0" stopColor="var(--brand)" stopOpacity="0.8" />
          <stop offset="1" stopColor="var(--brand)" />
        </linearGradient>
      </defs>

      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={x(t)} y1={topPad} x2={x(t)} y2={axisTop - 4}
            className="stroke-slate-100 dark:stroke-slate-800/70" strokeWidth="1"
          />
          <text x={x(t)} y={axisTop + 14} textAnchor="middle" fontSize="10"
                className="fill-slate-400 dark:fill-slate-500">
            {(t * 100).toFixed(0)}%
          </text>
        </g>
      ))}

      <g>
        <text x={labelW - 12} y={rowY(0) + barH / 2 + 4} textAnchor="end" fontSize="12.5"
              className="fill-slate-500 dark:fill-slate-400">
          Base rate
        </text>
        <rect x={x(Math.min(0, base))} y={rowY(0)}
              width={Math.max(Math.abs(x(base) - x(0)), 3)} height={barH} rx="6"
              className="fill-slate-300/90 dark:fill-slate-600/90" />
        <text x={x(base) + 7} y={rowY(0) + barH / 2 + 4} fontSize="11" fontWeight="600"
              className="fill-slate-500 dark:fill-slate-400 font-mono tabular-nums">
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
                  className="fill-slate-700 dark:fill-slate-300">
              {truncate(s.f.name, 22)}
            </text>
            <line x1={x(s.from)} y1={y - rowH + barH} x2={x(s.from)} y2={y + barH}
                  className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" />
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
              className="font-mono tabular-nums"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.05 }}
            >
              {up ? "+" : "−"}{Math.abs(s.delta * 100).toFixed(1)}
            </motion.text>
          </g>
        );
      })}

      <g>
        <line x1={x(final)} y1={rowY(n) + barH} x2={x(final)} y2={rowY(n + 1) + barH}
              className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" />
        <text x={labelW - 12} y={rowY(n + 1) + barH / 2 + 4} textAnchor="end" fontSize="13"
              fontWeight="700" className="fill-slate-900 dark:fill-slate-100">
          Predicted risk
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
  );
}
