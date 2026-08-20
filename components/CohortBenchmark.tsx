"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadCohortStats, percentileOf, type CohortStats } from "@/lib/cohort";
import { useMeasuredWidth } from "@/lib/useMeasuredWidth";
import type { Assessment } from "@/lib/contract";

function scoreOf(a: Assessment): number {
  if (typeof a.riskValue === "number") return a.riskValue * 100;
  const parsed = parseFloat(a.riskScore);
  return Number.isFinite(parsed) ? parsed : 0;
}

function OutcomeDots({ stats }: { stats: CohortStats }) {
  const reduce = useReducedMotion();
  const rows = [
    { label: "No CVD event", value: stats.avgRiskNoEvent, n: stats.nNoEvent, filled: false },
    { label: "CVD event", value: stats.avgRiskEvent, n: stats.nEvent, filled: true },
  ];

  return (
    <div className="space-y-3">
      <div className="relative h-11">
        <div className="absolute inset-x-0 top-[18px] h-px bg-[color-mix(in_srgb,var(--foreground)_14%,transparent)]" />
        {rows.map((r, i) => (
          <motion.div
            key={r.label}
            className="absolute top-[18px]"
            style={{ left: `${r.value}%` }}
            initial={reduce ? false : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          >
            <span
              className="block size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--card)]"
              style={{
                background: r.filled
                  ? "color-mix(in srgb, var(--foreground) 72%, transparent)"
                  : "var(--card)",
                boxShadow: r.filled
                  ? undefined
                  : "inset 0 0 0 2px color-mix(in srgb, var(--foreground) 45%, transparent)",
              }}
            />
          </motion.div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1.5">
        {rows.map((r) => (
          <span key={r.label} className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{
                background: r.filled
                  ? "color-mix(in srgb, var(--foreground) 72%, transparent)"
                  : "var(--card)",
                boxShadow: r.filled
                  ? undefined
                  : "inset 0 0 0 2px color-mix(in srgb, var(--foreground) 45%, transparent)",
              }}
            />
            {r.label}
            <span className="tabular-nums text-foreground/80">{r.value}%</span>
            <span className="text-muted-foreground/60">n={r.n}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function CohortBenchmark({ assessment }: { assessment: Assessment }) {
  const [stats, setStats] = useState<CohortStats | null>(null);
  const [failed, setFailed] = useState(false);
  const reduce = useReducedMotion();
  const { ref, width } = useMeasuredWidth<HTMLDivElement>(560);

  useEffect(() => {
    let alive = true;
    loadCohortStats()
      .then((s) => alive && setStats(s))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  if (failed) return null;

  const score = Math.round(scoreOf(assessment));

  const W = Math.max(260, Math.round(width));
  const padX = 14;
  const markerTop = 30;
  const distH = 54;
  const axisY = markerTop + distH + 8;
  const H = axisY + 30;
  const plotW = W - padX * 2;
  const x = (v: number) => padX + (v / 100) * plotW;

  return (
    <Card className="border-border/70 shadow-soft">
      <CardHeader className="px-7 pt-7 sm:px-8">
        <CardTitle className="font-heading text-xl font-semibold tracking-tight">
          Compared with the reference cohort
        </CardTitle>
        <CardDescription>
          Where this estimate falls among {stats?.n ?? 200} LURIC patients rated on the same 0–100
          risk scale.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8 px-7 pb-7 sm:px-8 sm:pb-8">
        <div ref={ref}>
          {!stats ? (
            <div className="h-[7.5rem] animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]" />
          ) : (
            <>
              <svg
                viewBox={`0 0 ${W} ${H}`}
                width={W}
                height={H}
                className="block max-w-full"
                role="img"
                aria-label={`This patient scores ${score}%, higher than ${percentileOf(
                  score,
                  stats.sortedRisks
                )}% of the ${stats.n}-patient cohort whose average is ${stats.avgRisk}%.`}
              >
                {stats.bins.map((b, i) => {
                  const maxCount = Math.max(...stats.bins.map((x) => x.count), 1);
                  const barW = plotW / stats.bins.length;
                  const h = b.count === 0 ? 0 : 5 + (b.count / maxCount) * (distH - 5);
                  return (
                    <motion.rect
                      key={b.lo}
                      x={padX + i * barW + 1}
                      width={Math.max(barW - 2, 1)}
                      rx="3"
                      fill="color-mix(in srgb, var(--foreground) 15%, transparent)"
                      initial={reduce ? false : { height: 0, y: axisY - 6 }}
                      animate={{ height: h, y: axisY - 6 - h }}
                      transition={{ duration: 0.5, delay: 0.03 * i, ease: [0.23, 1, 0.32, 1] }}
                    />
                  );
                })}

                <line
                  x1={padX}
                  y1={axisY}
                  x2={W - padX}
                  y2={axisY}
                  stroke="color-mix(in srgb, var(--foreground) 18%, transparent)"
                  strokeWidth="1"
                />
                {[0, 50, 100].map((t) => (
                  <text
                    key={t}
                    x={t === 0 ? padX : t === 100 ? W - padX : x(t)}
                    y={axisY + 17}
                    textAnchor={t === 0 ? "start" : t === 100 ? "end" : "middle"}
                    fontSize="11"
                    fill="var(--muted-foreground)"
                  >
                    {t}%
                  </text>
                ))}

                <motion.g
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45, duration: 0.35 }}
                >
                  <line
                    x1={x(stats.avgRisk)}
                    y1={markerTop + 2}
                    x2={x(stats.avgRisk)}
                    y2={axisY}
                    stroke="color-mix(in srgb, var(--foreground) 30%, transparent)"
                    strokeWidth="1.5"
                  />
                  <text
                    x={
                      x(stats.avgRisk) > W - 80
                        ? x(stats.avgRisk) - 5
                        : x(stats.avgRisk) + 5
                    }
                    y={markerTop - 6}
                    textAnchor={x(stats.avgRisk) > W - 80 ? "end" : "start"}
                    fontSize="11.5"
                    fill="var(--muted-foreground)"
                  >
                    avg {stats.avgRisk}%
                  </text>
                </motion.g>

                <motion.g
                  initial={reduce ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                >
                  <line
                    x1={x(score)}
                    y1={markerTop - 16}
                    x2={x(score)}
                    y2={axisY + 2}
                    stroke="var(--foreground)"
                    strokeWidth="2"
                  />
                  <circle cx={x(score)} cy={axisY} r="4.5" fill="var(--foreground)" />
                  <text
                    x={Math.min(Math.max(x(score), padX + 14), W - padX - 14)}
                    y={markerTop - 22}
                    textAnchor={
                      x(score) < 40 ? "start" : x(score) > W - 40 ? "end" : "middle"
                    }
                    fontSize="14"
                    fontWeight="600"
                    fill="var(--foreground)"
                  >
                    {score}%
                  </text>
                </motion.g>
              </svg>

              <p className="mt-4 text-[15px] leading-relaxed">
                This estimate is higher than{" "}
                <span className="font-semibold">{percentileOf(score, stats.sortedRisks)}%</span> of
                the cohort and sits{" "}
                {score < stats.avgRisk ? "below" : "above"} its average of {stats.avgRisk}%.
              </p>
            </>
          )}
        </div>

        {stats && (
          <>
            <section className="space-y-3">
              <h3 className="text-[13px] font-medium text-muted-foreground">
                How the cohort&apos;s scores tracked real outcomes
              </h3>
              <OutcomeDots stats={stats} />
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Patients who went on to have an event scored{" "}
                {(stats.avgRiskEvent - stats.avgRiskNoEvent).toFixed(1)} points higher on average —
                an AUC of {stats.auc.toFixed(2)}.
              </p>
            </section>

            <p className="border-t border-border/60 pt-4 text-[13px] leading-relaxed text-muted-foreground">
              The reference cohort is a coronary-angiography population, so its scores skew high
              (median {stats.medianRisk}%, range {stats.minRisk}–{stats.maxRisk}%). Read the
              position as context, not as a diagnosis.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
