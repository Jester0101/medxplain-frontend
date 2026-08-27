"use client";

const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+/;

type Block = { kind: "paragraph" | "list"; lines: string[] };

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

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className="rounded bg-foreground/8 px-1 py-0.5 font-mono text-[12px]">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      {toBlocks(text).map((block, bi) =>
        block.kind === "list" ? (
          <ul key={bi} className="list-disc space-y-1 pl-4">
            {block.lines.map((line, li) => (
              <li key={li}>
                <Inline text={line.replace(BULLET, "")} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={bi} className="whitespace-pre-wrap">
            <Inline text={block.lines.join("\n")} />
          </p>
        )
      )}
    </div>
  );
}
