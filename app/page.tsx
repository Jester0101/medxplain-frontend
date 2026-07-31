"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { ClinicalSummary } from "@/components/ClinicalSummary";
import { ExtractedProfile } from "@/components/ExtractedProfile";
import { PatientIntake } from "@/components/PatientIntake";
import { RiskHero } from "@/components/RiskHero";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FactorBars } from "@/components/charts/FactorBars";
import { ForcePlot } from "@/components/charts/ForcePlot";
import { RiskWaterfall } from "@/components/charts/RiskWaterfall";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { assess } from "@/lib/api";
import { type Assessment } from "@/lib/contract";
import { MODELS, PRESETS } from "@/lib/presets";

const tabTriggerClass =
  "data-[state=active]:text-[var(--brand-ink)] dark:data-[state=active]:text-[var(--brand-ink)]";

const sectionVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

type HistoryEntry = { id: number; at: number; assessment: Assessment };

function riskLevelDot(a: Assessment): string {
  const risk = a.riskValue ?? parseFloat(a.riskScore) / 100;
  return risk > 0.2 ? "bg-rose-500" : risk > 0.1 ? "bg-amber-500" : "bg-emerald-500";
}

export default function Home() {
  const highPreset = PRESETS.find((p) => p.risk === "high") ?? PRESETS[0];
  const [note, setNote] = useState("");
  const [model, setModel] = useState(MODELS[0]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: assess,
    onSuccess: (assessment) => {
      const entry: HistoryEntry = { id: Date.now(), at: Date.now(), assessment };
      setHistory((prev) => [entry, ...prev].slice(0, 8));
      setCurrentId(entry.id);
    },
    onError: (err) => toast.error("Assessment failed", { description: err.message }),
  });

  const current = history.find((h) => h.id === currentId)?.assessment ?? null;
  const showEmpty = !current && !mutation.isPending && !mutation.isError;

  const runExample = () => {
    setNote(highPreset.note);
    mutation.mutate({ note: highPreset.note, model });
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[400px_minmax(0,1fr)]">
        <div className="space-y-4 lg:sticky lg:top-8">
          <PatientIntake
            note={note}
            onNoteChange={setNote}
            model={model}
            onModelChange={setModel}
            onAssess={() => mutation.mutate({ note, model })}
            isPending={mutation.isPending}
          />

          {history.length > 0 && (
            <div className="space-y-2 px-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
                This session
              </p>
              <div className="flex flex-wrap gap-1.5">
                {history.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setCurrentId(h.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs tabular-nums transition-all hover:bg-muted/70 active:scale-[0.95] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none ${
                      h.id === currentId
                        ? "border-[color-mix(in_srgb,var(--brand)_45%,transparent)] bg-[color-mix(in_srgb,var(--brand)_8%,transparent)]"
                        : ""
                    }`}
                  >
                    <span aria-hidden className={`size-1.5 rounded-full ${riskLevelDot(h.assessment)}`} />
                    {h.assessment.riskScore}
                    <span className="font-sans text-muted-foreground">
                      {new Date(h.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex h-full flex-col space-y-6">
          {showEmpty && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex-1"
            >
              <Card className="relative flex h-full min-h-72 flex-col items-center justify-center overflow-hidden border-border/70 px-6 py-12 text-center shadow-soft">
                <div className="relative">
                  <h2 className="font-heading text-xl font-semibold tracking-tight">
                    Ready when you are
                  </h2>
                  <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
                    Write a clinical note on the left, or start with a sample patient to see the
                    score, attribution charts and summary.
                  </p>
                  <button
                    type="button"
                    onClick={runExample}
                    className="mt-5 inline-flex items-center rounded-full border border-white/10 bg-[#d6d3cd] px-5 py-2.5 text-sm font-medium text-[#171717] transition-colors hover:bg-[#e7e5e4] active:bg-[#c7c4be]"
                  >
                    Try the high-risk example
                  </button>
                </div>
              </Card>
            </motion.div>
          )}

          {mutation.isError && !mutation.isPending && (
            <Card className="border-[var(--risk-up)]/40 shadow-soft">
              <CardContent className="flex items-center gap-3 text-sm">
                <AlertCircle className="size-5 shrink-0 text-[var(--risk-up)]" />
                <div>
                  <p className="font-medium">Assessment failed</p>
                  <p className="text-muted-foreground">
                    {mutation.error.message} — check that the API is reachable and try again.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {mutation.isPending && (
            <div className="space-y-6" aria-label="Loading results">
              <Skeleton className="h-52 rounded-[calc(var(--radius)+6px)]" />
              <Skeleton className="h-72 rounded-xl" />
              <div className="grid gap-6 xl:grid-cols-2">
                <Skeleton className="h-56 rounded-xl" />
                <Skeleton className="h-56 rounded-xl" />
              </div>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {current && !mutation.isPending && (
              <motion.div
                key={currentId}
                className="space-y-6"
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, y: 8 }}
                transition={{ staggerChildren: 0.1 }}
              >
                <motion.div variants={sectionVariants}>
                  <RiskHero assessment={current} />
                </motion.div>

                <motion.div variants={sectionVariants}>
                  <Card className="border-border/70 shadow-soft">
                    <CardHeader>
                      <CardTitle className="font-heading text-xl font-semibold tracking-tight">Attribution</CardTitle>
                      <CardDescription>
                        <span className="font-medium" style={{ color: "var(--risk-up)" }}>
                          Red raises
                        </span>{" "}
                        the score,{" "}
                        <span className="font-medium" style={{ color: "var(--risk-down)" }}>
                          blue lowers
                        </span>{" "}
                        it.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="waterfall">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="waterfall" className={tabTriggerClass}>
                            Waterfall
                          </TabsTrigger>
                          <TabsTrigger value="factors" className={tabTriggerClass}>
                            Factors
                          </TabsTrigger>
                          <TabsTrigger value="force" className={tabTriggerClass}>
                            Force plot
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="waterfall" className="pt-5">
                          <RiskWaterfall assessment={current} />
                        </TabsContent>
                        <TabsContent value="factors" className="pt-5">
                          <FactorBars factors={current.factors} />
                        </TabsContent>
                        <TabsContent value="force" className="pt-5">
                          <ForcePlot assessment={current} />
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={sectionVariants} className="grid gap-6">
                  <ExtractedProfile factors={current.factors} />
                  <ClinicalSummary summary={current.summary} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>
    </div>
  );
}
