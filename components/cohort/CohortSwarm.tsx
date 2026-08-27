"use client";

import { useCallback, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { packSwarm } from "@/lib/beeswarm";
import { EVENT_COLOR, NO_EVENT_COLOR } from "@/components/cohort/PatientComparison";
import type { CohortPatient, CohortStats } from "@/lib/cohort";

const ROW_GAP = 10;
const MIN_ROW_HEIGHT = 34;
const PICK_RADIUS = 44;

export function CohortSwarm({
  width,
  patients,
  stats,
  score,
  activeId,
  onSelect,
}: {
  width: number;
  patients: CohortPatient[];
  stats: CohortStats;
  score: number;
  activeId: number | null;
  onSelect: (id: number) => void;
}) {
  const reduce = useReducedMotion();

  const W = Math.max(280, Math.round(width));
  const padX = 16;
  const compact = W < 430;
  const plotLeft = padX + (compact ? 0 : 96);
  const plotW = W - plotLeft - padX;
  const radius = plotW > 520 ? 3.4 : 2.8;
  const x = useCallback((v: number) => plotLeft + (v / 100) * plotW, [plotLeft, plotW]);

  const rows = useMemo(
    () =>
      [0, 1].map((event) => ({
        event,
        points: packSwarm(
          patients.filter((p) => p.event === event).map((p) => ({ x: x(p.risk), datum: p })),
          radius
        ),
      })),
    [patients, x, radius]
  );

  const avgLabelY = 13;
  const patientLabelY = compact ? 31 : 13;
  const markerLane = compact ? 50 : 26;

  const rowHeights = rows.map((r) =>
    Math.max(MIN_ROW_HEIGHT, 2 * (Math.max(0, ...r.points.map((p) => Math.abs(p.y))) + radius + 3))
  );
  const rowCenters = rowHeights.map(
    (h, i) => markerLane + rowHeights.slice(0, i).reduce((s, v) => s + v + ROW_GAP, 0) + h / 2
  );
  const axisY = rowCenters[rowCenters.length - 1] + rowHeights[rowHeights.length - 1] / 2 + 12;
  const H = axisY + 26;

  function selectNearest(e: React.MouseEvent<SVGRectElement>) {
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
        const distance = dx * dx + dy * dy;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestId = p.datum.i;
        }
      }
    });
    if (bestId !== null && bestDistance <= PICK_RADIUS * PICK_RADIUS) onSelect(bestId);
  }

  const patientLabelFlips = x(score) > W - 120;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className="block max-w-full overflow-visible"
      role="img"
      aria-label={`This estimate of ${Math.round(score)}% sits among ${stats.n} cohort patients whose average is ${stats.avgRisk}%.`}
    >
      <rect
        x="0"
        y="0"
        width={W}
        height={H}
        fill="transparent"
        className="cursor-pointer"
        onClick={selectNearest}
      />

      {rows.map((row, ri) => (
        <g key={row.event}>
          <text
            x={compact ? padX : plotLeft - 12}
            y={compact ? rowCenters[ri] - rowHeights[ri] / 2 - 4 : rowCenters[ri] + 4}
            textAnchor={compact ? "start" : "end"}
            fontSize="11"
            fill="var(--muted-foreground)"
          >
            {row.event === 1 ? "CVD event" : "No CVD event"}
            <tspan fill="color-mix(in srgb, var(--foreground) 35%, transparent)">
              {"  "}n={row.points.length}
            </tspan>
          </text>

          {row.points.map((p, pi) => {
            const isActive = activeId === p.datum.i;
            const base = row.event === 1 ? EVENT_COLOR : NO_EVENT_COLOR;
            return (
              <motion.circle
                key={p.datum.i}
                cx={p.x}
                cy={rowCenters[ri] + p.y}
                r={isActive ? radius + 2.2 : radius}
                fill={
                  isActive
                    ? row.event === 1
                      ? EVENT_COLOR
                      : "var(--foreground)"
                    : row.event === 1
                      ? `color-mix(in srgb, ${base} 55%, transparent)`
                      : base
                }
                stroke={isActive ? "var(--card)" : "none"}
                strokeWidth={isActive ? 1.5 : 0}
                className="cursor-pointer"
                onClick={() => onSelect(p.datum.i)}
                initial={reduce ? false : { opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.32,
                  delay: reduce ? 0 : Math.min(pi * 0.0016, 0.28),
                  ease: [0.23, 1, 0.32, 1],
                }}
              >
                <title>{`Patient #${p.datum.i + 1}: ${p.datum.risk}%, ${
                  p.datum.event === 1 ? "had an event" : "no event"
                }`}</title>
              </motion.circle>
            );
          })}
        </g>
      ))}

      <line
        x1={plotLeft}
        y1={axisY}
        x2={W - padX}
        y2={axisY}
        stroke="color-mix(in srgb, var(--foreground) 16%, transparent)"
        strokeWidth="1"
      />
      {[0, 25, 50, 75, 100].map((t) => (
        <text
          key={t}
          x={t === 0 ? plotLeft : t === 100 ? W - padX : x(t)}
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
        <text x={W - padX} y={avgLabelY} textAnchor="end" fontSize="11" fill="var(--muted-foreground)">
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
            patientLabelFlips
              ? Math.max(x(score) - 10, plotLeft + 60)
              : Math.min(x(score) + 10, W - padX - 110)
          }
          y={patientLabelY}
          textAnchor={patientLabelFlips ? "end" : "start"}
          fontSize="12.5"
          fontWeight="600"
          fill="var(--foreground)"
        >
          this patient {Math.round(score)}%
        </text>
      </motion.g>
    </svg>
  );
}
