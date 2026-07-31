"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ClinicalSummary({ summary }: { summary: string }) {
  return (
    <Card className="h-full border-border/70 shadow-soft">
      <CardHeader>
        <CardTitle className="font-heading text-xl font-semibold tracking-tight">
          Clinical summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-[15px] leading-relaxed text-foreground/90">{summary}</p>
      </CardContent>
    </Card>
  );
}
