"use client";

import { Cpu, CornerDownLeft, Loader2, NotebookPen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MODELS, PRESETS } from "@/lib/presets";

const PRESET_DOT: Record<"low" | "moderate" | "high", string> = {
  low: "bg-emerald-500",
  moderate: "bg-amber-500",
  high: "bg-rose-500",
};

type Props = {
  note: string;
  onNoteChange: (note: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  onAssess: () => void;
  isPending: boolean;
};

export function PatientIntake({
  note,
  onNoteChange,
  model,
  onModelChange,
  onAssess,
  isPending,
}: Props) {
  const canSubmit = note.trim().length > 0 && !isPending;

  return (
    <Card className="border-border/70 shadow-soft">
      <CardHeader>
        <CardTitle className="font-heading text-xl font-semibold tracking-tight">Patient intake</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <label
            htmlFor="model-select"
            className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground"
          >
            <Cpu className="size-3.5" />
            Model
          </label>
          <Select value={model} onValueChange={onModelChange}>
            <SelectTrigger
              id="model-select"
              className="w-full rounded-xl transition-shadow focus-visible:border-teal-500/40 focus-visible:ring-4 focus-visible:ring-teal-500/15"
            >
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="note-input"
            className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground"
          >
            <NotebookPen className="size-3.5" />
            Input note
          </label>
          <Textarea
            id="note-input"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && canSubmit) onAssess();
            }}
            placeholder="e.g. 62yo man with hypertension, LDL 160 mg/dL, HDL 40 mg/dL, current smoker…"
            className="min-h-36 resize-y rounded-xl border-border/60 bg-background/50 text-[15px] leading-relaxed transition-shadow focus-visible:border-teal-500/40 focus-visible:ring-4 focus-visible:ring-teal-500/15"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Examples:</span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onNoteChange(p.note)}
              className="inline-flex items-center gap-2 rounded-full border bg-background px-3.5 py-1.5 text-sm font-normal transition-all hover:bg-muted/70 active:scale-[0.96] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span aria-hidden className={`size-2 rounded-full ${PRESET_DOT[p.risk]}`} />
              {p.label}
            </button>
          ))}
        </div>

        <Button
          type="button"
          size="lg"
          className="group w-full bg-gradient-to-b from-teal-500 to-teal-600 text-[15px] text-white shadow-lg shadow-teal-600/25 transition-all hover:shadow-teal-600/40 active:scale-[0.98] disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none dark:from-teal-400 dark:to-teal-500 dark:text-slate-900 dark:disabled:from-slate-700 dark:disabled:to-slate-700"
          disabled={!canSubmit}
          onClick={onAssess}
        >
          {isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Sparkles className="transition-transform group-hover:scale-110" />
          )}
          {isPending ? "Assessing…" : "Assess risk"}
          {!isPending && (
            <kbd className="ml-1 hidden items-center gap-0.5 rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium sm:inline-flex">
              <CornerDownLeft className="size-2.5" />
            </kbd>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
