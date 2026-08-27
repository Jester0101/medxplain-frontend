import type { Factor } from "./contract";

export type NoteSpan = { text: string; factor?: Factor };

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function aliasesFor(name: string): string[] {
  const aliases = [name];

  const parenthesised = name.match(/\(([A-Za-z][A-Za-z0-9-]{1,})\)/)?.[1];
  if (parenthesised) aliases.push(parenthesised);

  const withoutParens = name.replace(/\s*\([^)]*\)/g, "").trim();
  if (withoutParens && withoutParens !== name) aliases.push(withoutParens);

  const first = withoutParens.split(/[^A-Za-z0-9]+/)[0];
  if (first && first.length >= 3 && first === first.toUpperCase() && /[A-Z]/.test(first)) {
    aliases.push(first);
  }

  return [...new Set(aliases)].sort((a, b) => b.length - a.length);
}

function patternsFor(f: Factor): RegExp[] {
  const name = f.name.toLowerCase();
  const num = f.value.match(/-?\d+(?:\.\d+)?/)?.[0];

  if (name === "age" && num) {
    return [
      new RegExp(`\\b${num}\\s*(?:yo|y/o|year[- ]?old|years?|yr)\\b`, "i"),
      new RegExp(`\\bage[:\\s]+${num}\\b`, "i"),
    ];
  }

  if (name === "sex" || name === "gender") {
    const v = f.value.toLowerCase();
    return [v.startsWith("m") ? /\b(?:man|male)\b/i : /\b(?:woman|female)\b/i];
  }

  const aliases = aliasesFor(f.name);
  const withNumber: RegExp[] = [];
  const exact: RegExp[] = [];

  for (const alias of aliases) {
    if (num) {
      withNumber.push(
        new RegExp(
          `${escapeRegex(alias)}[^0-9a-zA-Z]{0,12}${escapeRegex(num)}\\s*(?:%|[a-zA-Zµμ]+(?:/[a-zA-Z0-9.²]+)*)?`,
          "i"
        )
      );
    }
    exact.push(new RegExp(`\\b${escapeRegex(alias)}\\b`, "i"));
  }

  const stem: RegExp[] = [];
  const firstWord = f.name.split(/[^A-Za-z0-9]+/)[0] ?? "";
  const stemSource = /\s/.test(f.name)
    ? firstWord.length >= 6
      ? firstWord
      : ""
    : firstWord.length >= 5
      ? firstWord
      : f.name;
  if (stemSource.length >= 5) {
    const cut = stemSource.slice(0, Math.max(4, stemSource.length - 3));
    stem.push(new RegExp(`\\b${escapeRegex(cut)}\\w*\\b`, "i"));
  }

  return [...withNumber, ...exact, ...stem];
}

export function highlightNote(note: string, factors: Factor[]): NoteSpan[] {
  const taken: [number, number][] = [];
  const hits: { start: number; end: number; factor: Factor }[] = [];
  const overlaps = (s: number, e: number) => taken.some(([a, b]) => s < b && e > a);

  const ordered = [...factors].sort((a, b) => b.name.length - a.name.length);
  for (const f of ordered) {
    for (const re of patternsFor(f)) {
      const global = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
      for (const m of note.matchAll(global)) {
        if (m.index === undefined || m[0].length === 0) continue;
        const start = m.index;
        const end = start + m[0].length;
        if (overlaps(start, end)) continue;
        hits.push({ start, end, factor: f });
        taken.push([start, end]);
      }
    }
  }

  hits.sort((a, b) => a.start - b.start);

  const spans: NoteSpan[] = [];
  let cursor = 0;
  for (const h of hits) {
    if (h.start > cursor) spans.push({ text: note.slice(cursor, h.start) });
    spans.push({ text: note.slice(h.start, h.end), factor: h.factor });
    cursor = h.end;
  }
  if (cursor < note.length) spans.push({ text: note.slice(cursor) });
  return spans;
}
