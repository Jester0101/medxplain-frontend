"use client";

import { useEffect, useState } from "react";
import { CircleCheck, OctagonAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Assessment } from "@/lib/contract";

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

export function RiskCard({ assessment }: { assessment: Assessment }) {
  const risk = riskValueOf(assessment);
  const level = risk > 0.2 ? "high" : risk > 0.1 ? "moderate" : "low";
  const { label, color, Icon } = LEVELS[level];

  const target = Math.round(risk * 100);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || document.hidden) {
      setDisplay(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const duration = 900;
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

  const r = 60;
  const c = 2 * Math.PI * r;
  const filled = c * Math.min(1, Math.max(0, risk));

  return (
    <Card className="h-full shadow-md shadow-slate-900/[0.04] dark:shadow-black/20">
      <CardHeader>
        <CardTitle className="text-lg">Risk score</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-3.5 pb-6">
        <div className="relative">
          <svg width="160" height="160" viewBox="0 0 160 160" role="img"
               aria-label={`Risk score ${assessment.riskScore}, ${label}`}>
            <circle cx="80" cy="80" r={r} fill="none" strokeWidth="11"
                    className="stroke-slate-200/70 dark:stroke-slate-700/60" />
            <circle
              cx="80" cy="80" r={r} fill="none" strokeWidth="11"
              stroke={color} strokeLinecap="round"
              strokeDasharray={`${filled} ${c - filled}`}
              transform="rotate(-90 80 80)"
              style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.22,1,0.36,1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[40px] font-semibold leading-none tracking-tight tabular-nums"
                  style={{ color }}>
              {display}%
            </span>
            <span className="mt-1 text-[11px] text-muted-foreground">1-year estimate</span>
          </div>
        </div>
        <Badge
          variant="outline"
          className="gap-1.5 border-transparent px-2.5 py-1 font-medium"
          style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
        >
          <Icon className="size-3.5" />
          {label}
        </Badge>
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground/70">
          &lt;10% low · 10–20% moderate · &gt;20% high
        </p>
        {assessment.model && (
          <p className="max-w-full truncate text-xs text-muted-foreground" title={assessment.model}>
            Model: {assessment.model}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
