"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Crosshair } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { packSwarm } from "@/lib/beeswarm";
import {
  loadCohortPatients,
  loadCohortStats,
  nearestPatient,
  percentileOf,
  type CohortPatient,
  type CohortStats,
} from "@/lib/cohort";
import { useMeasuredWidth } from "@/lib/useMeasuredWidth";
import type { Assessment } from "@/lib/contract";

const EVENT_COLOR = "var(--risk-up)";
const NO_EVENT_COLOR = "color-mix(in srgb, var(--foreground) 42%, transparent)";

function scoreOf(a: Assessment): number {
  if (typeof a.riskValue === "number") return a.riskValue * 100;
  const parsed = parseFloat(a.riskScore);
  return Number.isFinite(parsed) ? parsed : 0;
}

function Swatch({ event }: { event: boolean }) {
  return (
    <span
      aria-hidden
      className="size-2.5 shrink-0 rounded-full"
      style={
        event
          ? { background: EVENT_COLOR }
          : { boxShadow: `inset 0 0 0 1.5px ${NO_EVENT_COLOR}` }
      }
    />
  );
}

const QUALIFIERS =
  /\b(?:elevated|raised|increased|high|low|reduced|decreased|severe|mild|moderate|current|former|chronic|history|of|the|a|status|level|value|class)\b/g;

function tokensOf(name: string): Set<string> {
  const cleaned = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(QUALIFIERS, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return new Set(cleaned.split(" ").filter((t) => t.length >= 3));
}

const ALIASES: Record<string, string> = {
  crp: "creactive",
  creactive: "creactive",
  protein: "creactive",
  probnp: "probnp",
  bnp: "probnp",
  ldl: "ldl",
  hdl: "hdl",
  smoker: "smoking",
  smoking: "smoking",
  diabetes: "diabetes",
  diabetic: "diabetes",
  cad: "coronary",
  coronary: "coronary",
};

function keysOf(name: string): Set<string> {
  const keys = new Set<string>();
  for (const t of tokensOf(name)) keys.add(ALIASES[t] ?? t);
  return keys;
}

function overlaps(a: Set<string>, b: Set<string>): boolean {
  for (const k of a) if (b.has(k)) return true;
  return false;
}

function Chip({ label, shared }: { label: string; shared: boolean }) {
  return (
    <li
      className="rounded-md px-2 py-1 text-[12px]"
      style={{
        background: shared
          ? "color-mix(in srgb, var(--risk-up) 13%, transparent)"
          : "color-mix(in srgb, var(--foreground) 6%, transparent)",
        color: shared ? "var(--risk-up)" : "var(--muted-foreground)",
      }}
      title={shared ? "Present on both sides" : undefined}
    >
      {label}
    </li>
  );
}

function ComparisonPanel({
  score,
  patient,
  ourFactors,
}: {
  score: number;
  patient: CohortPatient;
  ourFactors: string[];
}) {
  const { ourVisible, ourShared, theirShared } = useMemo(() => {
    const ours = ourFactors.map((name) => ({ name, keys: keysOf(name) }));
    const theirs = patient.factors.map((f) => ({ name: f.name, keys: keysOf(f.name) }));
    const shared = new Set(
      ours.filter((o) => theirs.some((t) => overlaps(o.keys, t.keys))).map((o) => o.name)
    );
    return {
      ourShared: shared,
      theirShared: new Set(
        theirs.filter((t) => ours.some((o) => overlaps(o.keys, t.keys))).map((t) => t.name)
      ),
      ourVisible: [
        ...new Set([...ourFactors.slice(0, 5), ...ourFactors.filter((n) => shared.has(n))]),
      ],
    };
  }, [ourFactors, patient]);

  return (
    <div className="grid gap-px overflow-hidden rounded-xl bg-border/60 sm:grid-cols-2">
      <div className="bg-card px-5 py-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.13em] text-muted-foreground">
          This estimate
        </p>
        <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums tracking-tight">
          {Math.round(score)}%
        </p>
        <p className="mt-3 text-[13px] text-muted-foreground">Top factors</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {ourVisible.map((name) => (
            <Chip key={name} label={name} shared={ourShared.has(name)} />
          ))}
        </ul>
      </div>

      <div className="bg-card px-5 py-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.13em] text-muted-foreground">
          Cohort patient #{patient.i + 1}
        </p>
        <div className="mt-1.5 flex items-baseline gap-2.5">
          <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
            {patient.risk}%
          </p>
          <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Swatch event={patient.event === 1} />
            {patient.event === 1 ? "had an event" : "no event"}
          </span>
        </div>
        <p className="mt-3 text-[13px] text-muted-foreground">
          {patient.age}-year-old {patient.sex}
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {patient.factors.map((f) => (
            <Chip key={f.name} label={f.name} shared={theirShared.has(f.name)} />
          ))}
        </ul>
      </div>
    </div>
  );
}

export function CohortBenchmark({ assessment }: { assessment: Assessment }) {
  const [stats, setStats] = useState<CohortStats | null>(null);
  const [patients, setPatients] = useState<CohortPatient[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const { ref, width } = useMeasuredWidth<HTMLDivElement>(560);

  const score = scoreOf(assessment);

  useEffect(() => {
    let alive = true;
    Promise.all([loadCohortStats(), loadCohortPatients()])
      .then(([s, p]) => {
        if (!alive) return;
        setStats(s);
        setPatients(p);
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

  const W = Math.max(280, Math.round(width));
  const padX = 16;
  const plotW = W - padX * 2;
  const x = (v: number) => padX + (v / 100) * plotW;
  const radius = plotW > 520 ? 3.4 : 2.8;

  const rows = useMemo(() => {
    if (!patients) return [];
    return [0, 1].map((event) => ({
      event,
      points: packSwarm(
        patients.filter((p) => p.event === event).map((p) => ({ x: x(p.risk), datum: p })),
        radius
      ),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients, W, radius]);

  if (failed) return null;

  const compact = W < 430;
  const avgLabelY = 13;
  const patientLabelY = compact ? 31 : 13;
  const markerLane = compact ? 40 : 24;
  const rowHeights = rows.map((r) =>
    Math.max(34, 2 * (Math.max(0, ...r.points.map((p) => Math.abs(p.y))) + radius + 3))
  );
  const rowCenters = rowHeights.map(
    (h, i) => markerLane + rowHeights.slice(0, i).reduce((s, v) => s + v + 10, 0) + h / 2
  );
  const swarmBottom = rowCenters.length
    ? rowCenters[rowCenters.length - 1] + rowHeights[rowHeights.length - 1] / 2
    : markerLane;
  const axisY = swarmBottom + 12;
  const H = axisY + 26;

  function pickNearest(e: React.MouseEvent<SVGRectElement>) {
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const scale = box.width / W || 1;
    const px = (e.clientX - box.left) / scale;
    const py = (e.clientY - box.top) / scale;

    let bestId: number | null = null;
    let bestDistance = Infinity;
    rows.forEach((row, ri) => {
      for (const p of row.points) {
        const dx = p.x - px;
        const dy = rowCenters[ri] + p.y - py;
        const d = dx * dx + dy * dy;
        if (d < bestDistance) {
          bestDistance = d;
          bestId = p.datum.i;
        }
      }
    });
    if (bestId !== null && bestDistance <= 44 * 44) setSelected(bestId);
  }

  function step(direction: 1 | -1) {
    if (!active || byScore.length === 0) return;
    const idx = byScore.findIndex((p) => p.i === active.i);
    const next = byScore[Math.min(Math.max(idx + direction, 0), byScore.length - 1)];
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
              <svg
                viewBox={`0 0 ${W} ${H}`}
                width={W}
                height={H}
                className="block max-w-full overflow-visible"
                role="img"
                aria-label={`This estimate of ${Math.round(score)}% sits higher than ${percentileOf(
                  score,
                  stats.sortedRisks
                )}% of the ${stats.n}-patient cohort, whose average is ${stats.avgRisk}%.`}
              >
                <rect
                  x="0"
                  y="0"
                  width={W}
                  height={H}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={pickNearest}
                />

                {rows.map((row, ri) => (
                  <g key={row.event}>
                    <text
                      x={padX}
                      y={rowCenters[ri] - rowHeights[ri] / 2 - 4}
                      fontSize="11"
                      fill="var(--muted-foreground)"
                    >
                      {row.event === 1 ? "CVD event" : "No CVD event"}
                      <tspan fill="color-mix(in srgb, var(--foreground) 35%, transparent)">
                        {"  "}n={row.points.length}
                      </tspan>
                    </text>
                    {row.points.map((p, pi) => {
                      const isActive = active?.i === p.datum.i;
                      return (
                        <motion.circle
                          key={p.datum.i}
                          cx={p.x}
                          cy={rowCenters[ri] + p.y}
                          r={isActive ? radius + 2.2 : radius}
                          fill={
                            row.event === 1
                              ? isActive
                                ? EVENT_COLOR
                                : `color-mix(in srgb, ${EVENT_COLOR} 55%, transparent)`
                              : isActive
                                ? "var(--foreground)"
                                : NO_EVENT_COLOR
                          }
                          stroke={isActive ? "var(--card)" : "none"}
                          strokeWidth={isActive ? 1.5 : 0}
                          className="cursor-pointer"
                          onClick={() => setSelected(p.datum.i)}
                          initial={reduce ? false : { opacity: 0, scale: 0.4 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            duration: 0.32,
                            delay: reduce ? 0 : Math.min(pi * 0.0016, 0.28),
                            ease: [0.23, 1, 0.32, 1],
                          }}
                        >
                          <title>{`Patient #${p.datum.i + 1} — ${p.datum.risk}%, ${
                            p.datum.event === 1 ? "had an event" : "no event"
                          }`}</title>
                        </motion.circle>
                      );
                    })}
                  </g>
                ))}

                <line
                  x1={padX}
                  y1={axisY}
                  x2={W - padX}
                  y2={axisY}
                  stroke="color-mix(in srgb, var(--foreground) 16%, transparent)"
                  strokeWidth="1"
                />
                {[0, 25, 50, 75, 100].map((t) => (
                  <text
                    key={t}
                    x={t === 0 ? padX : t === 100 ? W - padX : x(t)}
                    y={axisY + 15}
                    textAnchor={t === 0 ? "start" : t === 100 ? "end" : "middle"}
                    fontSize="10.5"
                    fill="var(--muted-foreground)"
                  >
                    {t}%
                  </text>
                ))}

                <motion.g
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                >
                  <line
                    x1={x(stats.avgRisk)}
                    y1={avgLabelY + 6}
                    x2={x(stats.avgRisk)}
                    y2={axisY}
                    stroke="color-mix(in srgb, var(--foreground) 26%, transparent)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={W - padX}
                    y={avgLabelY}
                    textAnchor="end"
                    fontSize="11"
                    fill="var(--muted-foreground)"
                  >
                    cohort avg {stats.avgRisk}%
                  </text>
                </motion.g>

                <motion.g
                  initial={reduce ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                >
                  <line
                    x1={x(score)}
                    y1={patientLabelY + 6}
                    x2={x(score)}
                    y2={axisY}
                    stroke="var(--foreground)"
                    strokeWidth="1.75"
                  />
                  <path
                    d={`M ${x(score)} ${patientLabelY + 1} l 5.5 5.5 l -5.5 5.5 l -5.5 -5.5 Z`}
                    fill="var(--foreground)"
                  />
                  <text
                    x={
                      x(score) > W - 120
                        ? Math.max(x(score) - 10, padX + 60)
                        : Math.min(x(score) + 10, W - padX - 110)
                    }
                    y={patientLabelY}
                    textAnchor={x(score) > W - 120 ? "end" : "start"}
                    fontSize="12.5"
                    fontWeight="600"
                    fill="var(--foreground)"
                  >
                    this patient {Math.round(score)}%
                  </text>
                </motion.g>
              </svg>

              <p className="mt-3 text-[15px] leading-relaxed">
                This estimate is higher than{" "}
                <span className="font-semibold">{percentileOf(score, stats.sortedRisks)}%</span> of
                the cohort and sits {score < stats.avgRisk ? "below" : "above"} its average of{" "}
                {stats.avgRisk}%. Patients who went on to have an event scored{" "}
                {(stats.avgRiskEvent - stats.avgRiskNoEvent).toFixed(1)} points higher on average —
                an AUC of {stats.auc.toFixed(2)}.
              </p>
            </>
          )}
        </div>

        {stats && patients && active && (
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
                  className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
                  className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            <ComparisonPanel
              score={score}
              patient={active}
              ourFactors={assessment.factors.map((f) => f.name)}
            />
          </section>
        )}

        {stats && (
          <p className="border-t border-border/60 pt-4 text-[13px] leading-relaxed text-muted-foreground">
            The reference cohort is a coronary-angiography population, so its scores skew high
            (median {stats.medianRisk}%, range {stats.minRisk}–{stats.maxRisk}%) and it was sampled
            to be half events by design. Read the position as context, not as a diagnosis.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
