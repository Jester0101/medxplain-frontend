"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { askAssessmentChat } from "@/lib/api";
import type { Assessment, ChatPatientContext } from "@/lib/contract";

type Message = { role: "user" | "assistant"; text: string };


function toContext(assessment: Assessment): ChatPatientContext {
  const sorted = [...assessment.factors].sort((a, b) => b.importance - a.importance);
  return {
    patient_profile: Object.fromEntries(sorted.map((f) => [f.name, f.value])),
    risk_score: assessment.riskScore,
    risk_drivers_positive: sorted.filter((f) => f.direction === "up").map((f) => `${f.name}: ${f.impact}`),
    risk_drivers_negative: sorted.filter((f) => f.direction === "down").map((f) => `${f.name}: ${f.impact}`),
    clinical_summary: assessment.summary,
  };
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <span className="size-1.5 animate-bounce rounded-full bg-foreground/25 [animation-delay:0ms]" />
      <span className="size-1.5 animate-bounce rounded-full bg-foreground/25 [animation-delay:120ms]" />
      <span className="size-1.5 animate-bounce rounded-full bg-foreground/25 [animation-delay:240ms]" />
    </div>
  );
}

export function AssessmentChat({ assessment }: { assessment: Assessment | null }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const context = useMemo(() => (assessment ? toContext(assessment) : null), [assessment]);

  const canAsk = !!context && !isLoading && question.trim().length > 1;

  useEffect(() => {
    function onDocumentClick(e: MouseEvent) {
      if (!isOpen) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", onDocumentClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (!assessment) return null;

  async function onSubmit() {
    if (!context || !canAsk) return;
    const trimmed = question.trim();
    setQuestion("");
    setError(null);
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    try {
      const res = await askAssessmentChat({ question: trimmed, patient_context: context });
      setMessages((prev) => [...prev, { role: "assistant", text: res.answer }]);
      if (!isOpen) setUnreadCount((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div ref={panelRef} className="fixed bottom-5 right-5 z-60">
      {isOpen ? (
        /* ── Widget panel ── */
        <div className="flex h-[580px] w-[380px] flex-col overflow-hidden rounded-2xl border border-black/8 bg-card shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:border-white/10 dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/6 px-4 py-3.5 dark:border-white/8">
            <span className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">
              Ask about this analysis
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
              className="rounded-full text-foreground/50 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/8"
            >
              <X className="size-3.5" />
            </Button>
          </div>

          {/* Empty state — outside ScrollArea so flex-1 + justify-center work */}
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
              <p className="mb-1 text-[13px] font-medium text-foreground/80">
                Ask a question
              </p>
              <p className="max-w-55 text-[12px] leading-relaxed text-foreground/40">
                Ask about risk factors, drivers, or the clinical summary.
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <ScrollArea className="flex-1">
              <div className="space-y-2.5 px-4 py-4">
                {messages.map((m, i) => (
                  <div
                    key={`${m.role}-${i}`}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                        m.role === "user"
                          ? "rounded-br-sm bg-foreground text-background"
                          : "rounded-bl-sm bg-black/5 text-foreground dark:bg-white/8"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-sm bg-black/5 px-3.5 py-3 dark:bg-white/8">
                      <TypingIndicator />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}

          {/* Input */}
          <div className="border-t border-black/6 px-3 pb-3 pt-2.5 dark:border-white/8">
            {error && (
              <p className="mb-2 text-[11px] text-destructive">{error}</p>
            )}
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={context ? "Ask a question…" : "Run an assessment first."}
                disabled={!context || isLoading}
                rows={1}
                className="min-h-9 resize-none rounded-xl border-black/10 bg-black/[0.03] text-[13px] placeholder:text-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/20 dark:border-white/10 dark:bg-white/5"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void onSubmit();
                  }
                }}
                aria-label="Question input"
              />
              <Button
                onClick={() => void onSubmit()}
                disabled={!canAsk}
                size="icon-sm"
                aria-label="Send"
                className="shrink-0 rounded-xl bg-foreground text-background hover:bg-foreground/85 disabled:opacity-25 dark:bg-white dark:text-black dark:hover:bg-white/85"
              >
                <Send className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Floating trigger ── */
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Ask about this analysis"
          disabled={!context}
          className="relative flex items-center gap-2 rounded-full border border-black/8 bg-background px-4 py-2.5 text-foreground shadow-[0_4px_20px_rgba(0,0,0,0.10)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_6px_24px_rgba(0,0,0,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
        >
          <MessageCircle className="size-4" />
          <span className="text-[13px] font-medium">Ask about this analysis</span>
          {unreadCount > 0 && (
            <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
