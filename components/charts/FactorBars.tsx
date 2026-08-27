"use client";
import { motion } from "framer-motion";
import { attributionMap, formatPp, signedValue, type Assessment } from "@/lib/contract";

export function FactorBars({ assessment }: { assessment: Assessment }) {
  const factors = assessment.factors;
  const phi = attributionMap(assessment);
  const scale = [...phi.values()];
  const rows = [...factors].sort((a, b) => Math.abs(signedValue(b)) - Math.abs(signedValue(a)));
  const max = Math.max(...rows.map((f) => Math.abs(signedValue(f))), 0.001);
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No factors to display.</p>;
  }
  return (
    <div className="space-y-1">
      {rows.map((f, i) => {
        const v = signedValue(f);
        const pct = (Math.abs(v) / max) * 50;
        const up = v > 0;
        const color = up ? "var(--risk-up)" : "var(--risk-down)";
        return (
          <div
            key={f.name}
            className="group -mx-2 grid grid-cols-[minmax(0,1fr)_2.2fr_auto] items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            title={f.impact}
            tabIndex={0}
            aria-label={`${f.name} ${f.value}: ${f.impact}`}
          >
            <span className="truncate text-sm">
              <b>{f.name}</b>
              {f.value !== "present" ? <span className="text-muted-foreground"> {f.value}</span> : ""}
            </span>
            <div className="relative h-7 rounded-lg bg-slate-100/70 dark:bg-slate-800/50">
              <div className="absolute inset-y-0 left-1/2 w-px bg-slate-300 dark:bg-slate-600" />
              <motion.div
                className="absolute inset-y-1 rounded"
                style={{ background: color, [up ? "left" : "right"]: "50%" } as React.CSSProperties}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.55, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <span className="text-sm font-mono font-medium tabular-nums" style={{ color }}>
              {up ? "+" : "−"}
              {(phi.get(f) ?? 0) >= 0 ? "+" : "−"}
              {formatPp(phi.get(f) ?? 0, scale)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
