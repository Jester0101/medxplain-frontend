"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ClinicalSummary({ summary }: { summary: string }) {
  return (
    <Card className="h-full border-border/70 shadow-soft">
      <CardHeader className="px-7 pt-7 sm:px-8">
        <CardTitle className="font-heading text-xl font-semibold tracking-tight">
          Clinical summary
        </CardTitle>
      </CardHeader>
      <CardContent className="px-7 pb-7 sm:px-8 sm:pb-8">
        <p className="max-w-[68ch] text-[16px] leading-[1.75] text-foreground/85">{summary}</p>
      </CardContent>
    </Card>
  );
}
