"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { assess } from "@/lib/api";
import {
  clearPendingAssessment,
  getPendingAssessment,
  setLatestAssessment,
  setLatestNote,
} from "@/lib/assessmentSession";

export default function LoadingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const pending = useMemo(() => getPendingAssessment(), []);

  useEffect(() => {
    if (!pending) {
      router.replace("/");
      return;
    }

    let mounted = true;
    assess({ note: pending.note, model: pending.model })
      .then((result) => {
        if (!mounted) return;
        setLatestAssessment(result);
        setLatestNote(pending.note);
        clearPendingAssessment();
        router.replace("/results");
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : "Assessment failed";
        setError(message);
      });

    return () => {
      mounted = false;
    };
  }, [pending, router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm space-y-5 text-center"
      >
        {!error ? (
          <>
            <div className="flex justify-center">
              <Loader2 className="size-9 animate-spin text-foreground/45" />
            </div>
            <motion.p
              className="text-[15px] text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.08 }}
            >
              Analysing cardiovascular risk…
            </motion.p>
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-[15px] font-medium">Assessment failed</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={() => router.replace("/")}
              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-border/70 px-4 py-2 text-sm transition-colors hover:bg-muted/60"
            >
              Back to input
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
