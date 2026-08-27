"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Crosshair } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CohortSwarm } from "@/components/cohort/CohortSwarm";
import { PatientComparison } from "@/components/cohort/PatientComparison";
import {
  loadCohortPatients,
  loadCohortStats,
  nearestPatient,
  percentileOf,
  type CohortPatient,
  type CohortStats,
} from "@/lib/cohort";
import { riskValueOf, type Assessment } from "@/lib/contract";
import { useMeasuredWidth } from "@/lib/useMeasuredWidth";

const stepButtonClass =
  "inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export function CohortBenchmark({ assessment }: { assessment: Assessment }) {
  const [stats, setStats] = useState<CohortStats | null>(null);
  const [patients, setPatients] = useState<CohortPatient[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const { ref, width } = useMeasuredWidth<HTMLDivElement>(560);

  const score = riskValueOf(assessment) * 100;

  useEffect(() => {
    let alive = true;
    Promise.all([loadCohortStats(), loadCohortPatients()])
      .then(([loadedStats, loadedPatients]) => {
        if (!alive) return;
        setStats(loadedStats);
        setPatients(loadedPatients);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const byScore = useMemo(
    () => (patients ? [...patients].sort((a, b) => a.risk - b.risk) : []),
    [patients]
  );

  const active = useMemo(() => {
    if (!patients) return null;
    if (selected !== null) return patients.find((p) => p.i === selected) ?? null;
    return nearestPatient(score, patients);
  }, [patients, selected, score]);

  if (failed) return null;

  function step(direction: 1 | -1) {
    if (!active || byScore.length === 0) return;
    const index = byScore.findIndex((p) => p.i === active.i);
    const next = byScore[Math.min(Math.max(index + direction, 0), byScore.length - 1)];
    setSelected(next.i);
  }

  return (
    <Card className="border-border/70 shadow-soft">
      <CardHeader className="px-7 pt-7 sm:px-8">
        <CardTitle className="font-heading text-xl font-semibold tracking-tight">
          Compared with the reference cohort
        </CardTitle>
        <CardDescription>
          Every dot is one of {stats?.n ?? 200} LURIC patients, split by what actually happened to
          them. Pick a dot to compare this estimate with that patient.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 px-7 pb-7 sm:px-8 sm:pb-8">
        <div ref={ref}>
          {!stats || !patients ? (
            <div className="h-40 animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]" />
          ) : (
            <>
              <CohortSwarm
                width={width}
                patients={patients}
                stats={stats}
                score={score}
                activeId={active?.i ?? null}
                onSelect={setSelected}
              />
              <p className="mt-3 text-[15px] leading-relaxed">
                This estimate is higher than{" "}
                <span className="font-semibold">{percentileOf(score, stats.sortedRisks)}%</span> of
                the cohort and sits {score < stats.avgRisk ? "below" : "above"} its average of{" "}
                {stats.avgRisk}%. Patients who went on to have an event scored{" "}
                {(stats.avgRiskEvent - stats.avgRiskNoEvent).toFixed(1)} points higher on average
                (AUC {stats.auc.toFixed(2)}).
              </p>
            </>
          )}
        </div>

        {active && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[13px] font-medium text-muted-foreground">
                Side by side with one cohort patient
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous patient by score"
                  className={stepButtonClass}
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <Crosshair className="size-3.5" />
                  Closest score
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next patient by score"
                  className={stepButtonClass}
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            <PatientComparison
              score={score}
              patient={active}
              ourFactors={assessment.factors.map((f) => f.name)}
            />
          </section>
        )}
      </CardContent>
    </Card>
  );
}
