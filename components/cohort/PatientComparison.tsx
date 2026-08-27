"use client";

import { useMemo } from "react";
import { overlappingFactors } from "@/lib/factorMatching";
import type { CohortPatient } from "@/lib/cohort";

export const EVENT_COLOR = "var(--risk-up)";
export const NO_EVENT_COLOR = "color-mix(in srgb, var(--foreground) 42%, transparent)";

export function OutcomeSwatch({ event }: { event: boolean }) {
  return (
    <span
      aria-hidden
      className="size-2.5 shrink-0 rounded-full"
      style={
        event ? { background: EVENT_COLOR } : { boxShadow: `inset 0 0 0 1.5px ${NO_EVENT_COLOR}` }
      }
    />
  );
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

export function PatientComparison({
  score,
  patient,
  ourFactors,
}: {
  score: number;
  patient: CohortPatient;
  ourFactors: string[];
}) {
  const { ourVisible, ourShared, theirShared } = useMemo(() => {
    const theirNames = patient.factors.map((f) => f.name);
    const { left, right } = overlappingFactors(ourFactors, theirNames);
    return {
      ourShared: left,
      theirShared: right,
      ourVisible: [...new Set([...ourFactors.slice(0, 5), ...ourFactors.filter((n) => left.has(n))])],
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
            <OutcomeSwatch event={patient.event === 1} />
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
