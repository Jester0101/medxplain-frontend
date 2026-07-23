"use client";

import { HeartPulse, TrendingDown, TrendingUp, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REFERENCE } from "@/lib/reference";
import { signedValue, type Factor } from "@/lib/contract";

function headlineOf(factors: Factor[]): string {
  const age = parseInt(factors.find((f) => f.name === "Age")?.value ?? "", 10);
  const sex = factors.find((f) => f.name === "Sex")?.value;
  if (Number.isFinite(age) && sex) return `${age}-year-old ${sex}`;
  if (Number.isFinite(age)) return `${age}-year-old patient`;
  if (sex) return `${sex[0].toUpperCase()}${sex.slice(1)} patient`;
  return "Patient";
}

function DeltaTag({ f }: { f: Factor }) {
  const v = signedValue(f);
  const up = v > 0;
  const color = up ? "var(--risk-up)" : "var(--risk-down)";
  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-xs tabular-nums" style={{ color }}>
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {up ? "+" : "−"}
      {Math.abs(v).toFixed(2)}
    </span>
  );
}

export function ExtractedProfile({ factors }: { factors: Factor[] }) {
  const demographics = factors.filter((f) => f.category === "demographic");
  const biomarkers = factors.filter((f) => f.category === "biomarker");
  const conditions = factors.filter((f) => f.category === "comorbidity");
  const raises = factors.filter((f) => signedValue(f) > 0).length;
  const lowers = factors.length - raises;

  return (
    <Card className="lift h-full border-border/70 shadow-soft">
      <CardHeader>
        <CardTitle className="font-heading text-xl font-semibold tracking-tight">Patient profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {factors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recognizable factors found in the note.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3.5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full border bg-muted/60">
                <UserRound className="size-6 text-muted-foreground" />
              </span>
              <div className="min-w-0">
                <p className="font-heading text-[17px] font-semibold capitalize tracking-tight">
                  {headlineOf(factors)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {factors.length} factors extracted · {raises} raise risk
                  {lowers > 0 ? `, ${lowers} lower it` : ""}
                </p>
              </div>
              <div className="ml-auto flex shrink-0 flex-col items-end gap-1">
                {demographics.map((f) => (
                  <span key={f.name} title={f.impact} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {f.name} <DeltaTag f={f} />
                  </span>
                ))}
              </div>
            </div>

            {biomarkers.length > 0 && (
              <div>
                <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
                  Biomarkers
                </h3>
                <div className="divide-y divide-border/70 rounded-lg border">
                  {biomarkers.map((f) => {
                    const up = signedValue(f) > 0;
                    return (
                      <div
                        key={f.name}
                        tabIndex={0}
                        title={f.impact}
                        className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-3 px-3 py-2 text-sm transition-colors hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <span
                          aria-hidden
                          className="size-1.5 rounded-full"
                          style={{ background: up ? "var(--risk-up)" : "var(--risk-down)" }}
                        />
                        <span className="truncate font-medium">{f.name}</span>
                        <span className="text-right font-mono text-[13px] tabular-nums">
                          {f.value}
                          {REFERENCE[f.name] && (
                            <span className="ml-2 hidden font-sans text-[11px] text-muted-foreground sm:inline">
                              ref {REFERENCE[f.name]}
                            </span>
                          )}
                        </span>
                        <DeltaTag f={f} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {conditions.length > 0 && (
              <div>
                <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
                  Conditions
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {conditions.map((f) => {
                    const up = signedValue(f) > 0;
                    const color = up ? "var(--risk-up)" : "var(--risk-down)";
                    return (
                      <span
                        key={f.name}
                        tabIndex={0}
                        title={f.impact}
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs capitalize focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                        style={{
                          borderColor: `color-mix(in srgb, ${color} 25%, transparent)`,
                          backgroundColor: `color-mix(in srgb, ${color} 6%, transparent)`,
                        }}
                      >
                        <HeartPulse className="size-3" style={{ color }} />
                        <span className="font-medium">{f.name}</span>
                        <DeltaTag f={f} />
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
