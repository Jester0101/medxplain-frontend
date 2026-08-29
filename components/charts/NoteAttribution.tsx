"use client";

import { useMemo, useState } from "react";
import { attributionMap, formatPp, signedValue, type Assessment, type Factor } from "@/lib/contract";
import { highlightNote } from "@/lib/noteHighlight";

export function NoteAttribution({ note, assessment }: { note: string; assessment: Assessment }) {
  const [active, setActive] = useState<Factor | null>(null);
  const factors = assessment.factors;
  const phi = useMemo(() => attributionMap(assessment), [assessment]);

  const spans = useMemo(() => highlightNote(note, factors), [note, factors]);
  const max = useMemo(
    () => Math.max(0.001, ...factors.map((f) => Math.abs(signedValue(f)))),
    [factors]
  );

  if (!note.trim()) {
    return (
      <p className="text-sm text-muted-foreground">
        The original note isn&apos;t available for this result.
      </p>
    );
  }

  const matched = spans.filter((s) => s.factor).length;

  return (
    <div className="space-y-5">
      <p className="text-[17px] leading-[2] tracking-[-0.005em]">
        {spans.map((s, i) => {
          if (!s.factor) {
            return (
              <span key={i} className="text-foreground/55">
                {s.text}
              </span>
            );
          }
          const v = signedValue(s.factor);
          const up = v > 0;
          const color = up ? "var(--risk-up)" : "var(--risk-down)";
          const weight = Math.abs(v) / max;
          const isActive = active?.name === s.factor.name;
          return (
            <span
              key={i}
              tabIndex={0}
              role="button"
              aria-label={`${s.factor.name}: ${s.factor.impact}`}
              onMouseEnter={() => setActive(s.factor!)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(s.factor!)}
              onBlur={() => setActive(null)}
              className="cursor-help rounded-[5px] px-1.5 py-0.5 font-medium transition-[box-shadow,background-color] duration-150 focus-visible:outline-none"
              style={{
                backgroundColor: `color-mix(in srgb, ${color} ${12 + Math.round(weight * 26)}%, transparent)`,
                color: `color-mix(in srgb, ${color} 82%, var(--foreground))`,
                boxShadow: isActive ? `inset 0 0 0 1.5px ${color}` : "none",
                WebkitBoxDecorationBreak: "clone",
                boxDecorationBreak: "clone",
              }}
            >
              {s.text}
            </span>
          );
        })}
      </p>

      <div className="grid min-h-[4.25rem] rounded-xl border border-border/60 bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)] px-4 py-3">
        <div
          className="col-start-1 row-start-1 transition-opacity duration-150"
          style={{ opacity: active ? 1 : 0, pointerEvents: active ? "auto" : "none" }}
          aria-hidden={!active}
        >
          {active && (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-medium">
                  {active.name}
                  {active.value !== "present" && (
                    <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">
                      {active.value}
                    </span>
                  )}
                </span>
                <span
                  className="shrink-0 text-[13px] font-semibold tabular-nums"
                  style={{
                    color: `color-mix(in srgb, ${signedValue(active) > 0 ? "var(--risk-up)" : "var(--risk-down)"} 82%, var(--foreground))`,
                  }}
                >
                  {signedValue(active) > 0 ? "+" : "−"}
                  {formatPp(phi.get(active) ?? 0, [...phi.values()])}
                </span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{active.impact}</p>
            </>
          )}
        </div>
        <div
          className="col-start-1 row-start-1 transition-opacity duration-150"
          style={{ opacity: active ? 0 : 1, pointerEvents: active ? "none" : "auto" }}
          aria-hidden={!!active}
        >
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {matched > 0
              ? `${matched} phrases were matched to risk factors. Point at one to read why it counted.`
              : "No phrases in this note matched the extracted factors."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
        <span className="flex items-center gap-2">
          <span
            className="h-3 w-6 rounded-[3px]"
            style={{ backgroundColor: "color-mix(in srgb, var(--risk-up) 32%, transparent)" }}
          />
          raises risk
        </span>
        <span className="flex items-center gap-2">
          <span
            className="h-3 w-6 rounded-[3px]"
            style={{ backgroundColor: "color-mix(in srgb, var(--risk-down) 32%, transparent)" }}
          />
          lowers risk
        </span>
        <span className="text-muted-foreground/70">Stronger tint means a larger contribution.</span>
      </div>
    </div>
  );
}
