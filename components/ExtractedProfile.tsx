"use client";

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
    <span className="font-mono text-xs tabular-nums" style={{ color }}>
      {up ? "+" : "−"}
      {Math.abs(v).toFixed(2)}
    </span>
  );
}

function deviationFromReference(f: Factor): string | null {
  const ref = REFERENCE[f.name];
  if (!ref) return null;
  const limit = parseFloat(ref.replace(/[^0-9.]/g, ""));
  const value = parseFloat(f.value.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(limit) || !Number.isFinite(value) || limit === 0) return null;
  const ratio = value / limit;
  if (ref.trim().startsWith(">")) {
    return ratio < 1 ? `${Math.round((1 - ratio) * 100)}% below floor` : null;
  }
  return ratio > 1 ? `${ratio.toFixed(1)}× limit` : null;
}

function FactorRow({ f }: { f: Factor }) {
  const up = signedValue(f) > 0;
  const deviation = deviationFromReference(f);
  return (
    <div
      tabIndex={0}
      title={f.impact}
      className="grid grid-cols-[minmax(0,1fr)_auto_3.25rem] items-center gap-x-4 px-4 py-3 text-sm transition-colors hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full"
          style={{ background: up ? "var(--risk-up)" : "var(--risk-down)" }}
        />
        <span className="font-medium leading-snug">{f.name}</span>
      </div>
      <span className="flex flex-col items-end leading-tight">
        <span className="text-[13px] tabular-nums text-foreground/90">
          {f.value !== "present" ? f.value : "—"}
        </span>
        {REFERENCE[f.name] && (
          <span className="mt-0.5 text-[11px] text-muted-foreground">
            ref {REFERENCE[f.name]}
            {deviation && <span className="ml-1.5 text-foreground/60">· {deviation}</span>}
          </span>
        )}
      </span>
      <span className="justify-self-end">
        <DeltaTag f={f} />
      </span>
    </div>
  );
}

export function ExtractedProfile({ factors }: { factors: Factor[] }) {
  const biomarkers = factors.filter((f) => f.category === "biomarker");
  const conditions = factors.filter((f) => f.category === "comorbidity");
  const raises = factors.filter((f) => signedValue(f) > 0).length;
  const lowers = factors.length - raises;

  return (
    <Card className="h-full border-border/70 shadow-soft">
      <CardHeader className="px-7 pt-7 sm:px-8">
        <CardTitle className="font-heading text-xl font-semibold tracking-tight">
          Patient profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-7 px-7 pb-7 sm:px-8 sm:pb-8">
        {factors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recognizable factors found in the note.
          </p>
        ) : (
          <>
            <div>
              <p className="font-heading text-[17px] font-semibold capitalize tracking-tight">
                {headlineOf(factors)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {factors.length} factors extracted · {raises} raise risk
                {lowers > 0 ? `, ${lowers} lower it` : ""}
              </p>
            </div>

            {biomarkers.length > 0 && (
              <section className="space-y-2.5">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
                  Biomarkers
                </h3>
                <div className="overflow-hidden rounded-xl border border-border/70 divide-y divide-border/70">
                  {biomarkers.map((f) => (
                    <FactorRow key={f.name} f={f} />
                  ))}
                </div>
              </section>
            )}

            {conditions.length > 0 && (
              <section className="space-y-2.5">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
                  Conditions
                </h3>
                <div className="overflow-hidden rounded-xl border border-border/70 divide-y divide-border/70">
                  {conditions.map((f) => (
                    <FactorRow key={f.name} f={f} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
