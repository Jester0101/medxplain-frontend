"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AssessmentChat } from "@/components/AssessmentChat";
import { ClinicalSummary } from "@/components/ClinicalSummary";
import { ExtractedProfile } from "@/components/ExtractedProfile";
import { RiskHero } from "@/components/RiskHero";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FactorBars } from "@/components/charts/FactorBars";
import { ForcePlot } from "@/components/charts/ForcePlot";
import { RiskWaterfall } from "@/components/charts/RiskWaterfall";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clearLatestAssessment, getLatestAssessment } from "@/lib/assessmentSession";
import { type Assessment } from "@/lib/contract";

const tabTriggerClass =
  "data-[state=active]:text-[var(--brand-ink)] dark:data-[state=active]:text-[var(--brand-ink)]";

const sectionVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function ResultsPage() {
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);

  useEffect(() => {
    const cached = getLatestAssessment();
    if (!cached) {
      router.replace("/");
      return;
    }
    setAssessment(cached);
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

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8">
        <motion.div
          className="mb-4 flex justify-end"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.04 }}
        >
          <motion.button
            type="button"
            onClick={() => {
              clearLatestAssessment();
              router.push("/");
            }}
            className="inline-flex shrink-0 items-center rounded-full border border-border/70 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            New assessment
          </motion.button>
        </motion.div>
        <AnimatePresence mode="popLayout">
          <motion.div
            key="results"
            className="space-y-6"
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
                      <RiskWaterfall assessment={assessment} />
                    </TabsContent>
                    <TabsContent value="factors" className="pt-5">
                      <FactorBars factors={assessment.factors} />
                    </TabsContent>
                    <TabsContent value="force" className="pt-5">
                      <ForcePlot assessment={assessment} />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={sectionVariants} className="grid gap-6">
              <ExtractedProfile factors={assessment.factors} />
              <ClinicalSummary summary={assessment.summary} />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </main>
      <AssessmentChat assessment={assessment} />
    </motion.div>
  );
}
