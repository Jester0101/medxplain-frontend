"use client";
import { useId, useState } from "react";
import { motion } from "framer-motion";
import { signedValue, type Assessment, type Factor } from "@/lib/contract";

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

type Segment = { f: Factor; v: number; x: number; w: number };

export function ForcePlot({ assessment }: { assessment: Assessment }) {
  const uid = useId().replace(/[«»:]/g, "");
  const [active, setActive] = useState<Segment | null>(null);

  const factors = assessment.factors;
  const ups = factors.filter((f) => signedValue(f) > 0)
    .sort((a, b) => Math.abs(signedValue(a)) - Math.abs(signedValue(b)));
  const downs = factors.filter((f) => signedValue(f) < 0)
    .sort((a, b) => Math.abs(signedValue(b)) - Math.abs(signedValue(a)));

  const sumUp = ups.reduce((s, f) => s + Math.abs(signedValue(f)), 0);
  const sumDown = downs.reduce((s, f) => s + Math.abs(signedValue(f)), 0);
  const total = sumUp + sumDown;
  if (total === 0) {
    return <p className="text-sm text-muted-foreground">No factors to display.</p>;
  }

  const W = 640;
  const H = 152;
  const barY = 62;
  const barH = 34;
  const meet = (sumUp / total) * W;

  let cx = 0;
  const segments: Segment[] = [];
  for (const f of [...ups, ...downs]) {
    const v = signedValue(f);
    const w = (Math.abs(v) / total) * W;
    segments.push({ f, v, x: cx, w });
    cx += w;
  }

  const pillText = assessment.riskScore;
  const pillW = pillText.length * 8.5 + 22;
  const pillX = Math.min(Math.max(meet - pillW / 2, 4), W - pillW - 4);
  const pillY = 14;

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
           aria-label={`Force plot: contributions meeting at predicted risk ${assessment.riskScore}`}>
        <defs>
          <clipPath id={`${uid}-bar`}>
            <rect x="0" y={barY} width={W} height={barH} rx="12" />
          </clipPath>
        </defs>

        <circle cx={5} cy={barY - 12} r="3" fill="var(--risk-up)" />
        <text x={13} y={barY - 8.5} fontSize="10.5" className="fill-slate-500 dark:fill-slate-400">
          raises the score →
        </text>
        <circle cx={W - 110} cy={barY - 12} r="3" fill="var(--risk-down)" />
        <text x={W - 102} y={barY - 8.5} fontSize="10.5" className="fill-slate-500 dark:fill-slate-400">
          ← lowers the score
        </text>

        <g clipPath={`url(#${uid}-bar)`}>
          {segments.map((s, i) => {
            const up = s.v > 0;
            const isActive = active?.f.name === s.f.name;
            return (
              <motion.g
                key={`${s.f.name}-${i}`} tabIndex={0}
                className="cursor-pointer outline-none"
                onMouseEnter={() => setActive(s)} onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(s)} onBlur={() => setActive(null)}
                role="img" aria-label={`${s.f.name}: ${s.f.impact}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: active === null || isActive ? 1 : 0.4 }}
                transition={{ duration: 0.3, delay: 0.05 + i * 0.045 }}
              >
                <title>{s.f.impact}</title>
                <rect x={s.x} y={barY} width={s.w} height={barH}
                      fill={up ? "var(--risk-up)" : "var(--risk-down)"}
                      stroke="var(--card)" strokeWidth="2.5" />
              </motion.g>
            );
          })}
        </g>

        {segments.map((s, i) =>
          s.w > 62 ? (
            <text key={`lbl-${i}`} x={s.x + s.w / 2} y={barY + barH + 17} textAnchor="middle"
                  fontSize="10.5" className="fill-slate-500 dark:fill-slate-400 capitalize">
              {truncate(s.f.name, Math.floor(s.w / 6))}
            </text>
          ) : null
        )}

        <motion.g initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          <line x1={meet} y1={pillY + 26} x2={meet} y2={barY + barH + 2}
                stroke="var(--foreground)" strokeWidth="2" opacity="0.55" />
          <rect x={pillX} y={pillY} width={pillW} height="26" rx="13"
                fill="var(--foreground)" />
          <text x={pillX + pillW / 2} y={pillY + 17.5} textAnchor="middle" fontSize="13"
                fontWeight="700" fill="var(--background)" className="font-mono tabular-nums">
            {pillText}
          </text>
        </motion.g>
      </svg>

      <p className="min-h-10 text-sm text-muted-foreground">
        {active ? (
          <>
            <b className="capitalize text-foreground">{active.f.name}</b>
            {active.f.value !== "present" ? ` (${active.f.value})` : ""}
            {" — "}
            {active.f.impact}{" "}
            <span className="font-mono font-medium tabular-nums"
                  style={{ color: active.v > 0 ? "var(--risk-up)" : "var(--risk-down)" }}>
              {active.v > 0 ? "+" : "−"}{Math.abs(active.v).toFixed(2)}
            </span>
          </>
        ) : (
          "Hover or focus a segment to see its contribution."
        )}
      </p>
    </div>
  );
}
