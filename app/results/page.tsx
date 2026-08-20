"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AssessmentChat } from "@/components/AssessmentChat";
import { BrandMark } from "@/components/BrandMark";
import { ClinicalSummary } from "@/components/ClinicalSummary";
import { CohortBenchmark } from "@/components/CohortBenchmark";
import { ExtractedProfile } from "@/components/ExtractedProfile";
import { RiskHero } from "@/components/RiskHero";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FactorBars } from "@/components/charts/FactorBars";
import { ForcePlot } from "@/components/charts/ForcePlot";
import { NoteAttribution } from "@/components/charts/NoteAttribution";
import { RiskWaterfall } from "@/components/charts/RiskWaterfall";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clearLatestAssessment, getLatestAssessment, getLatestNote } from "@/lib/assessmentSession";
import { type Assessment } from "@/lib/contract";

const tabTriggerClass =
  "data-[state=active]:text-foreground data-[state=active]:font-medium";

const sectionVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function ResultsPage() {
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    const cached = getLatestAssessment();
    if (!cached) {
      router.replace("/");
      return;
    }
    setAssessment(cached);
    setNote(getLatestNote());
  }, [router]);

  if (!assessment) return null;

  return (
    <motion.div
      className="flex min-h-screen justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-8 sm:px-6">
        <motion.div
          className="mb-6 flex items-center justify-between gap-4"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.04 }}
        >
          <BrandMark />
          <motion.button
            type="button"
            onClick={() => {
              clearLatestAssessment();
              router.push("/");
            }}
            className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-border/70 px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            New assessment
          </motion.button>
        </motion.div>

        <AnimatePresence mode="popLayout">
          <motion.div
            key="results"
            className="space-y-7"
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: 8 }}
            transition={{ staggerChildren: 0.1 }}
          >
            <motion.div variants={sectionVariants}>
              <RiskHero assessment={assessment} />
            </motion.div>

            <motion.div variants={sectionVariants}>
              <Card className="border-border/70 shadow-soft">
                <CardHeader className="px-7 pt-7 sm:px-8">
                  <CardTitle className="font-heading text-xl font-semibold tracking-tight">
                    Attribution
                  </CardTitle>
                  <CardDescription>
                    Each factor moves the estimate up or down.{" "}
                    <span
                      className="font-medium"
                      style={{ color: "color-mix(in srgb, var(--risk-up) 82%, var(--foreground))" }}
                    >
                      Red raises
                    </span>{" "}
                    it,{" "}
                    <span
                      className="font-medium"
                      style={{ color: "color-mix(in srgb, var(--risk-down) 82%, var(--foreground))" }}
                    >
                      blue lowers
                    </span>{" "}
                    it.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-7 pb-7 sm:px-8 sm:pb-8">
                  <Tabs defaultValue="text">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="text" className={tabTriggerClass}>
                        Text
                      </TabsTrigger>
                      <TabsTrigger value="waterfall" className={tabTriggerClass}>
                        Waterfall
                      </TabsTrigger>
                      <TabsTrigger value="factors" className={tabTriggerClass}>
                        Factors
                      </TabsTrigger>
                      <TabsTrigger value="force" className={tabTriggerClass}>
                        <span className="sm:hidden">Force</span>
                        <span className="hidden sm:inline">Force plot</span>
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="text" className="pt-6">
                      <NoteAttribution note={note} factors={assessment.factors} />
                    </TabsContent>
                    <TabsContent value="waterfall" className="pt-6">
                      <RiskWaterfall assessment={assessment} />
                    </TabsContent>
                    <TabsContent value="factors" className="pt-6">
                      <FactorBars factors={assessment.factors} />
                    </TabsContent>
                    <TabsContent value="force" className="pt-6">
                      <ForcePlot assessment={assessment} />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              variants={sectionVariants}
              className="grid items-start gap-7 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
            >
              <ExtractedProfile factors={assessment.factors} />
              <ClinicalSummary summary={assessment.summary} />
            </motion.div>

            <motion.div variants={sectionVariants}>
              <CohortBenchmark assessment={assessment} />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </main>
      <AssessmentChat assessment={assessment} />
    </motion.div>
  );
}
