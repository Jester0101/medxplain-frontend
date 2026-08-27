"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, RotateCcw, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { askAssessmentChat } from "@/lib/api";
import { attributionsOf, baseValueOf, riskValueOf } from "@/lib/contract";
import type { Assessment, ChatMessage, ChatPatientContext } from "@/lib/contract";

type Message = ChatMessage & { failed?: boolean };

const SUGGESTIONS = [
  "Which factor moved the score the most, and by how much?",
  "How do the contributions add up to the final score?",
  "Which findings pull the risk down?",
];

const HISTORY_LIMIT = 12;

function toContext(assessment: Assessment, note: string): ChatPatientContext {
  const { items } = attributionsOf(assessment);
  const sorted = [...items].sort((a, b) => Math.abs(b.phi) - Math.abs(a.phi));
  return {
    patient_profile: Object.fromEntries(sorted.map(({ factor }) => [factor.name, factor.value])),
    risk_score: assessment.riskScore,
    risk_value: riskValueOf(assessment),
    base_value: baseValueOf(assessment),
    risk_drivers_positive: sorted
      .filter(({ phi }) => phi > 0)
      .map(({ factor }) => `${factor.name}: ${factor.impact}`),
    risk_drivers_negative: sorted
      .filter(({ phi }) => phi < 0)
      .map(({ factor }) => `${factor.name}: ${factor.impact}`),
    attributions: sorted.map(({ factor, phi }) => ({
      name: factor.name,
      value: factor.value,
      contribution: Number(phi.toFixed(4)),
      impact: factor.impact,
    })),
    clinical_note: note || undefined,
    clinical_summary: assessment.summary,
  };
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return <strong key={i}>{p.slice(2, -2)}</strong>;
        }
        if (p.startsWith("`") && p.endsWith("`")) {
          return (
            <code key={i} className="rounded bg-foreground/8 px-1 py-0.5 font-mono text-[12px]">
              {p.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+/;

type Chunk = { kind: "p"; lines: string[] } | { kind: "ul"; lines: string[] };

function chunk(text: string): Chunk[] {
  const chunks: Chunk[] = [];
  for (const line of text.trim().split("\n")) {
    if (!line.trim()) continue;
    const kind = BULLET.test(line) ? "ul" : "p";
    const last = chunks[chunks.length - 1];
    if (last && last.kind === kind) last.lines.push(line);
    else chunks.push({ kind, lines: [line] });
  }
  return chunks;
}

function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      {chunk(text).map((c, ci) =>
        c.kind === "ul" ? (
          <ul key={ci} className="list-disc space-y-1 pl-4">
            {c.lines.map((l, li) => (
              <li key={li}>
                <Inline text={l.replace(BULLET, "")} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={ci} className="whitespace-pre-wrap">
            <Inline text={c.lines.join("\n")} />
          </p>
        )
      )}
    </div>
  );
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

export function AssessmentChat({
  assessment,
  note = "",
}: {
  assessment: Assessment | null;
  note?: string;
}) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const openRef = useRef(isOpen);

  const context = useMemo(
    () => (assessment ? toContext(assessment, note) : null),
    [assessment, note]
  );

  const canAsk = !isLoading && question.trim().length > 1;

  useEffect(() => {
    openRef.current = isOpen;
  }, [isOpen]);

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

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [question, isOpen]);

  if (!assessment || !context) return null;

  async function send(text: string, priorMessages: Message[]) {
    const trimmed = text.trim();
    if (!trimmed || !context) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const history = priorMessages
      .filter((m) => !m.failed)
      .slice(-HISTORY_LIMIT)
      .map(({ role, content }) => ({ role, content }));

    setError(null);
    setIsLoading(true);
    setMessages([...priorMessages, { role: "user", content: trimmed }]);
    setQuestion("");

    try {
      const res = await askAssessmentChat(
        {
          question: trimmed,
          patient_context: context,
          history,
          model: assessment?.model,
        },
        controller.signal
      );
      setMessages((prev) => [...prev, { role: "assistant", content: res.answer }]);
      if (!openRef.current) setUnreadCount((prev) => prev + 1);
    } catch (err) {
      if (controller.signal.aborted) return;
      setMessages((prev) =>
        prev.map((m, i) => (i === prev.length - 1 ? { ...m, failed: true } : m))
      );
      setQuestion(trimmed);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }

  function onSubmit() {
    if (!canAsk) return;
    void send(question, messages);
  }

  function retryLast() {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    const upTo = messages.slice(0, messages.lastIndexOf(lastUser));
    void send(lastUser.content, upTo);
  }

  function reset() {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setIsLoading(false);
    setQuestion("");
  }

  return (
    <div ref={panelRef} className="fixed bottom-5 right-5 z-60">
      {isOpen ? (
        <div className="flex h-[580px] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-black/8 bg-card shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:border-white/10 dark:shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between border-b border-black/6 px-4 py-3.5 dark:border-white/8">
            <span className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">
              Ask about this analysis
            </span>
            <div className="flex items-center gap-0.5">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={reset}
                  aria-label="Clear conversation"
                  className="rounded-full text-foreground/50 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/8"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              )}
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
          </div>

          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4">
              <p className="text-[13px] font-medium text-foreground/80">Ask a question</p>
              <div className="flex w-full flex-col gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s, [])}
                    className="rounded-xl border border-black/8 px-3 py-2 text-left text-[12px] leading-snug text-foreground/70 transition-colors hover:bg-black/[0.04] hover:text-foreground dark:border-white/10 dark:hover:bg-white/[0.06]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <ScrollArea className="flex-1">
              <div className="space-y-2.5 px-4 py-4" role="log" aria-live="polite">
                {messages.map((m, i) => (
                  <div
                    key={`${m.role}-${i}`}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                        m.role === "user"
                          ? `rounded-br-sm bg-foreground text-background ${m.failed ? "opacity-45" : ""}`
                          : "rounded-bl-sm bg-black/5 text-foreground dark:bg-white/8"
                      }`}
                    >
                      {m.role === "assistant" ? <RichText text={m.content} /> : m.content}
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

          <div className="border-t border-black/6 px-3 pb-3 pt-2.5 dark:border-white/8">
            {error && (
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] text-destructive">{error}</p>
                <button
                  type="button"
                  onClick={retryLast}
                  className="shrink-0 text-[11px] font-medium text-foreground/60 underline underline-offset-2 hover:text-foreground"
                >
                  Retry
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question…"
                disabled={isLoading}
                rows={1}
                className="max-h-35 min-h-9 resize-none rounded-xl border-black/10 bg-black/[0.03] text-[13px] placeholder:text-foreground/30 focus-visible:ring-1 focus-visible:ring-foreground/20 dark:border-white/10 dark:bg-white/5"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSubmit();
                  }
                }}
                aria-label="Question input"
              />
              <Button
                onClick={onSubmit}
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
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Ask about this analysis"
          className="relative flex items-center gap-2 rounded-full border border-black/8 bg-background px-4 py-2.5 text-foreground shadow-[0_4px_20px_rgba(0,0,0,0.10)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_6px_24px_rgba(0,0,0,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 dark:border-white/10 dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
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
