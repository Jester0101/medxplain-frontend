import type { Factor } from "./contract";

export type NoteSpan = { text: string; factor?: Factor };

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patternsFor(f: Factor): RegExp[] {
  const name = f.name.toLowerCase();
  const num = f.value.match(/-?\d+(?:\.\d+)?/)?.[0];
  const pats: RegExp[] = [];

  if (name === "age" && num) {
    pats.push(new RegExp(`\\b${num}\\s*(?:yo|y/o|year[- ]?old|years?|yr)\\b`, "i"));
    pats.push(new RegExp(`\\bage[:\\s]+${num}\\b`, "i"));
    return pats;
  }

  if (name === "sex" || name === "gender") {
    const v = f.value.toLowerCase();
    pats.push(v.startsWith("m") ? /\b(?:man|male)\b/i : /\b(?:woman|female)\b/i);
    return pats;
  }

  if (num) {
    pats.push(
      new RegExp(
        `${escapeRegex(f.name)}[^0-9a-zA-Z]{0,12}${escapeRegex(num)}\\s*(?:%|[a-zA-Zµμ]+(?:/[a-zA-Z0-9.²]+)*)?`,
        "i"
      )
    );
  }
  pats.push(new RegExp(`\\b${escapeRegex(f.name)}\\b`, "i"));

  if (!/\s/.test(f.name) && f.name.length >= 5) {
    const stem = f.name.slice(0, Math.max(4, f.name.length - 3));
    pats.push(new RegExp(`\\b${escapeRegex(stem)}\\w*\\b`, "i"));
  }
  return pats;
}

export function highlightNote(note: string, factors: Factor[]): NoteSpan[] {
  const taken: [number, number][] = [];
  const hits: { start: number; end: number; factor: Factor }[] = [];
  const overlaps = (s: number, e: number) => taken.some(([a, b]) => s < b && e > a);

  const ordered = [...factors].sort((a, b) => b.name.length - a.name.length);
  for (const f of ordered) {
    for (const re of patternsFor(f)) {
      const m = note.match(re);
      if (!m || m.index === undefined) continue;
      const start = m.index;
      const end = start + m[0].length;
      if (overlaps(start, end)) continue;
      hits.push({ start, end, factor: f });
      taken.push([start, end]);
      break;
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
