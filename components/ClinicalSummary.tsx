"use client";

import { useState } from "react";
import { Check, Copy, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ClinicalSummary({ summary }: { summary: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast.success("Summary copied to clipboard");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy — clipboard unavailable");
    }
  };

  return (
    <Card className="lift border-[color-mix(in_srgb,var(--brand)_22%,transparent)] bg-[color-mix(in_srgb,var(--brand)_4%,transparent)] shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2.5 font-heading text-xl font-semibold tracking-tight">
            <span className="flex size-7 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--brand)_14%,transparent)]">
              <FileText className="size-4 text-[var(--brand-ink)]" />
            </span>
            Clinical summary
          </CardTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Copy summary"
            onClick={copy}
            className="text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="text-[var(--brand-ink)]" /> : <Copy />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-[15px] leading-relaxed text-foreground/90">{summary}</p>
      </CardContent>
    </Card>
  );
}
