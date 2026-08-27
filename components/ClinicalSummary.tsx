"use client";

import { Card, CardContent } from "@/components/ui/card";
import { riskLevelOf, type Assessment, type RiskLevel } from "@/lib/contract";

const ACCENT: Record<RiskLevel, string> = {
  low: "var(--risk-low)",
  moderate: "var(--risk-mid)",
  high: "var(--risk-up)",
};

export function ClinicalSummary({ assessment }: { assessment: Assessment }) {
  const accent = ACCENT[riskLevelOf(assessment)];

  return (
    <Card className="relative overflow-hidden border-border/70 shadow-soft">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: `color-mix(in srgb, ${accent} 62%, transparent)` }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(100deg, color-mix(in srgb, ${accent} 4%, transparent), transparent 42%)`,
        }}
      />

      <CardContent className="relative px-7 py-7 sm:px-9 sm:py-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Clinical summary
        </p>
        <p className="mt-4 max-w-[70ch] text-[17px] leading-[1.75] tracking-[-0.005em] text-foreground/90 sm:text-[18px]">
          {assessment.summary}
        </p>
      </CardContent>
    </Card>
  );
}
