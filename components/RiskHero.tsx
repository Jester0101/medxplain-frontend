"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CircleCheck, OctagonAlert, TriangleAlert } from "lucide-react";
import { signedValue, type Assessment } from "@/lib/contract";

function riskValueOf(a: Assessment): number {
  if (typeof a.riskValue === "number") return a.riskValue;
  const parsed = parseFloat(a.riskScore);
  return Number.isFinite(parsed) ? parsed / 100 : 0;
}

const LEVELS = {
  low: { label: "Low risk", color: "var(--brand)", Icon: CircleCheck },
  moderate: { label: "Moderate risk", color: "#d97706", Icon: TriangleAlert },
  high: { label: "High risk", color: "var(--risk-up)", Icon: OctagonAlert },
} as const;

function useCountUp(target: number) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || document.hidden) {
      setDisplay(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const duration = 1000;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const snap = window.setTimeout(() => setDisplay(target), duration + 200);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(snap);
    };
  }, [target]);
  return display;
}

export function RiskHero({ assessment }: { assessment: Assessment }) {
  const risk = riskValueOf(assessment);
  const level = risk > 0.2 ? "high" : risk > 0.1 ? "moderate" : "low";
  const { label, color, Icon } = LEVELS[level];
  const display = useCountUp(Math.round(risk * 100));

  const drivers = [...assessment.factors]
    .filter((f) => signedValue(f) > 0)
    .sort((a, b) => signedValue(b) - signedValue(a))
    .slice(0, 3)
    .map((f) => f.name);

  const r = 76;
  const c = 2 * Math.PI * r;
  const filled = c * Math.min(1, Math.max(0, risk));

  return (
    <div
      className="relative overflow-hidden rounded-[calc(var(--radius)+6px)] border shadow-soft"
      style={{
        background: `color-mix(in srgb, ${color} 4%, var(--card))`,
        borderColor: `color-mix(in srgb, ${color} 14%, var(--border))`,
      }}
    >
      <div className="relative flex flex-col items-center gap-8 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            1-year risk estimate
          </span>
          <div className="mt-1 flex items-end gap-1">
            <span className="font-heading text-[76px] font-bold leading-[0.9] tracking-tight tabular-nums text-foreground sm:text-[92px]">
              {display}
            </span>
            <span className="mb-2 text-4xl font-semibold text-foreground">%</span>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium"
            style={{
              color,
              borderColor: `color-mix(in srgb, ${color} 22%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
            }}
          >
            <Icon className="size-4" />
            {label}
          </motion.div>
          {drivers.length > 0 && (
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Main drivers:{" "}
              <span className="font-medium text-foreground/80">{drivers.join(", ")}</span>
            </p>
          )}
        </div>

        <div className="relative shrink-0">
          <svg width="188" height="188" viewBox="0 0 188 188" role="img"
               aria-label={`Risk ${assessment.riskScore}, ${label}`}>
            <circle cx="94" cy="94" r={r} fill="none" strokeWidth="12"
                    className="stroke-slate-200/60 dark:stroke-slate-700/50" />
            <motion.circle
              cx="94" cy="94" r={r} fill="none" strokeWidth="12"
              stroke={`color-mix(in srgb, ${color} 68%, transparent)`} strokeLinecap="round"
              transform="rotate(-90 94 94)"
              initial={{ strokeDasharray: `0 ${c}` }}
              animate={{ strokeDasharray: `${filled} ${c - filled}` }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div
              className="flex size-11 items-center justify-center rounded-full border"
              style={{
                borderColor: `color-mix(in srgb, ${color} 28%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${color} 9%, var(--card))`,
              }}
            >
              <Icon className="size-6" style={{ color: `color-mix(in srgb, ${color} 84%, var(--foreground))` }} />
            </div>
            <span className="mt-1.5 text-xs text-muted-foreground">{label.replace(" risk", "")}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
