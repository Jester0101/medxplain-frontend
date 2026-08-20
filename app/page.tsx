"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BrandMark } from "@/components/BrandMark";
import { PatientIntake } from "@/components/PatientIntake";
import { ThemeToggle } from "@/components/ThemeToggle";
import { listModels } from "@/lib/api";
import { resetAssessmentSession, setPendingAssessment } from "@/lib/assessmentSession";
import { MODEL_CATALOGUE } from "@/lib/presets";
import type { ModelInfo } from "@/lib/contract";

export default function Home() {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [models, setModels] = useState<ModelInfo[]>(MODEL_CATALOGUE);
  const [model, setModel] = useState(MODEL_CATALOGUE[0].id);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    let alive = true;
    listModels().then((list) => {
      if (!alive) return;
      setModels(list);
      const firstAvailable = list.find((m) => m.available !== false);
      if (firstAvailable) setModel(firstAvailable.id);
    });
    return () => {
      alive = false;
    };
  }, []);

  const beginAssessment = (targetNote: string) => {
    if (!targetNote.trim()) return;
    setIsNavigating(true);
    resetAssessmentSession();
    setPendingAssessment({ note: targetNote, model });
    router.push("/loading");
  };

  return (
    <motion.div
      className="flex min-h-screen items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="fixed left-4 top-4 z-50 sm:left-6 sm:top-6">
        <BrandMark />
      </div>

      <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <main className="mx-auto w-full max-w-[640px] px-4 py-10 sm:px-6 sm:py-14">
        <motion.div
          className="mx-auto"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.05 }}
        >
          <PatientIntake
            note={note}
            onNoteChange={setNote}
            model={model}
            onModelChange={setModel}
            models={models}
            onAssess={() => beginAssessment(note)}
            isPending={isNavigating}
          />
        </motion.div>
      </main>
    </motion.div>
  );
}
