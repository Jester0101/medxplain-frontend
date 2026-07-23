"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Button variant="outline" size="icon" aria-hidden className="rounded-full opacity-0" />;
  }
  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="outline"
      size="icon"
      className="relative overflow-hidden rounded-full transition-all active:scale-90"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "sun" : "moon"}
          initial={{ y: -18, opacity: 0, rotate: -90 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 18, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex items-center justify-center"
        >
          {isDark ? <Sun /> : <Moon />}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
