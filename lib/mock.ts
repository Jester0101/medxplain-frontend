import type { Assessment, Factor } from "./contract";

type Metric = { label: string; unit: string; highBad: boolean; ref: number };
const METRICS: Record<string, Metric> = {
  crp:          { label: "CRP",         unit: "mg/L",  highBad: true,  ref: 3 },
  cholesterol:  { label: "Cholesterol", unit: "mg/dL", highBad: true,  ref: 200 },
  ldl:          { label: "LDL",         unit: "mg/dL", highBad: true,  ref: 130 },
  hdl:          { label: "HDL",         unit: "mg/dL", highBad: false, ref: 50 },
  hba1c:        { label: "HbA1c",       unit: "%",     highBad: true,  ref: 5.7 },
  creatinine:   { label: "Creatinine",  unit: "mg/dL", highBad: true,  ref: 1.2 },
  "nt-probnp":  { label: "NT-proBNP",   unit: "pg/mL", highBad: true,  ref: 300 },
  troponin:     { label: "Troponin",    unit: "ng/L",  highBad: true,  ref: 14 },
  glucose:      { label: "Glucose",     unit: "mg/dL", highBad: true,  ref: 100 },
};
const CONDITIONS = [
  "diabetes","hypertension","smoking","obesity",
  "heart failure","atrial fibrillation","chronic kidney disease","copd",
];

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function mockAssessment(note: string, model?: string): Assessment {
  const text = note.toLowerCase();
  const factors: Factor[] = [];

  const age = text.match(/(\d{1,3})\s*(?:yo|y\/o|year|yr)/)?.[1] ?? text.match(/age[:\s]+(\d{1,3})/)?.[1];
  if (age) {
    const a = Number(age);
    factors.push({
      name: "Age", value: `${a} years`, category: "demographic",
      direction: a >= 55 ? "up" : "down",
      importance: clamp01(Math.abs(a - 50) / 45),
      impact: a >= 55 ? "Older age raises the score." : "Younger age lowers the score.",
    });
  }
  if (/\b(man|male|\bm\b)\b/.test(text)) {
    factors.push({ name: "Sex", value: "male", category: "demographic",
      direction: "up", importance: 0.25, impact: "Male sex modestly raises the score." });
  } else if (/\b(woman|female|\bf\b)\b/.test(text)) {
    factors.push({ name: "Sex", value: "female", category: "demographic",
      direction: "down", importance: 0.2, impact: "Female sex modestly lowers the score." });
  }
  for (const [key, meta] of Object.entries(METRICS)) {
    const re = new RegExp(`${key.replace(/[-]/g, "[- ]?")}[^0-9]{0,12}(\\d+(?:\\.\\d+)?)`, "i");
    const m = text.match(re);
    if (!m) continue;
    const v = Number(m[1]);
    const high = v > meta.ref;
    const raises = meta.highBad ? high : !high;
    factors.push({
      name: meta.label, value: `${v} ${meta.unit}`, category: "biomarker",
      direction: raises ? "up" : "down",
      importance: clamp01(Math.abs(v - meta.ref) / (meta.ref * 1.5)),
      impact: `${meta.label} of ${v} ${meta.unit} ${raises ? "raises" : "lowers"} the score.`,
    });
  }
  for (const c of CONDITIONS) {
    if (text.includes(c)) {
      factors.push({ name: c, value: "present", category: "comorbidity",
        direction: "up", importance: 0.55,
        impact: `${c[0].toUpperCase() + c.slice(1)} is a known contributing factor.` });
    }
  }

  const signed = factors.map(f => (f.direction === "up" ? f.importance : -f.importance));
  const base = 0.06;
  const riskValue = clamp01(base + signed.reduce((s, x) => s + x * 0.08, 0));
  factors.sort((a, b) => b.importance - a.importance);

  return {
    riskScore: `${(riskValue * 100).toFixed(0)}%`,
    riskValue,
    baseValue: base,
    factors,
    model,
    summary: buildSummary(riskValue, factors),
  };
}

function buildSummary(risk: number, factors: Factor[]): string {
  const up = factors.filter(f => f.direction === "up").slice(0, 3).map(f => f.name);
  const down = factors.filter(f => f.direction === "down").slice(0, 2).map(f => f.name);
  const level = risk > 0.2 ? "high" : risk > 0.1 ? "moderate" : "low";
  let s = `Estimated 1-year risk score: ${level} (${(risk*100).toFixed(0)}%).`;
  if (up.length)   s += ` The score is driven mainly by ${up.join(", ")}.`;
  if (down.length) s += ` Offsetting factors include ${down.join(" and ")}.`;
  return s;
}
