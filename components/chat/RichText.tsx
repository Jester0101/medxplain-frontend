"use client";

import { wordStepMs } from "@/lib/textReveal";

const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+/;

type Block = { kind: "paragraph" | "list"; lines: string[] };
type WordCounter = { value: number };

function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const line of text.trim().split("\n")) {
    if (!line.trim()) continue;
    const kind = BULLET.test(line) ? "list" : "paragraph";
    const last = blocks[blocks.length - 1];
    if (last && last.kind === kind) last.lines.push(line);
    else blocks.push({ kind, lines: [line] });
  }
  return blocks;
}

function AnimatedRun({
  text,
  animate,
  counter,
  step,
}: {
  text: string;
  animate: boolean;
  counter: WordCounter;
  step: number;
}) {
  if (!animate) return <>{text}</>;
  const tokens = text.match(/\S+\s*|\s+/g) ?? [text];
  return (
    <>
      {tokens.map((token, i) => {
        if (!token.trim()) return token;
        const delay = counter.value * step;
        counter.value += 1;
        return (
          <span key={i} className="chat-word" style={{ animationDelay: `${delay}ms` }}>
            {token}
          </span>
        );
      })}
    </>
  );
}

function Inline({
  text,
  animate,
  counter,
  step,
}: {
  text: string;
  animate: boolean;
  counter: WordCounter;
  step: number;
}) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i}>
              <AnimatedRun text={part.slice(2, -2)} animate={animate} counter={counter} step={step} />
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className="rounded bg-foreground/8 px-1 py-0.5 font-mono text-[12px]">
              <AnimatedRun text={part.slice(1, -1)} animate={animate} counter={counter} step={step} />
            </code>
          );
        }
        return <AnimatedRun key={i} text={part} animate={animate} counter={counter} step={step} />;
      })}
    </>
  );
}

export function RichText({ text, animate = false }: { text: string; animate?: boolean }) {
  const counter: WordCounter = { value: 0 };
  const totalWords = animate ? (text.match(/\S+/g)?.length ?? 0) : 0;
  const step = animate ? wordStepMs(totalWords) : 0;

  return (
    <div className="space-y-2">
      {toBlocks(text).map((block, bi) =>
        block.kind === "list" ? (
          <ul key={bi} className="list-disc space-y-1 pl-4">
            {block.lines.map((line, li) => (
              <li key={li}>
                <Inline text={line.replace(BULLET, "")} animate={animate} counter={counter} step={step} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={bi} className="whitespace-pre-wrap">
            <Inline text={block.lines.join("\n")} animate={animate} counter={counter} step={step} />
          </p>
        )
      )}
    </div>
  );
}
