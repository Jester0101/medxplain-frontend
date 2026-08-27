export type CohortStats = {
  n: number;
  source: string;
  avgRisk: number;
  minRisk: number;
  maxRisk: number;
  medianRisk: number;
  avgRiskNoEvent: number;
  avgRiskEvent: number;
  nNoEvent: number;
  nEvent: number;
  auc: number;
  sortedRisks: number[];
  bins: { lo: number; hi: number; count: number }[];
  topFactors: { marker: string; pct: number }[];
};

export async function loadCohortStats(): Promise<CohortStats> {
  const res = await fetch("/cohort-stats.json");
  if (!res.ok) throw new Error(`Cohort data unavailable (${res.status})`);
  return res.json();
}

export function percentileOf(score: number, sortedRisks: number[]): number {
  if (sortedRisks.length === 0) return 0;
  let below = 0;
  for (const r of sortedRisks) {
    if (r <= score) below += 1;
    else break;
  }
  return Math.round((below / sortedRisks.length) * 100);
}

export type CohortFactor = { name: string; risk: number };

export type CohortPatient = {
  i: number;
  risk: number;
  event: number;
  age: number | null;
  sex: string | null;
  factors: CohortFactor[];
};

export async function loadCohortPatients(): Promise<CohortPatient[]> {
  const res = await fetch("/cohort-patients.json");
  if (!res.ok) throw new Error(`Cohort patients unavailable (${res.status})`);
  return res.json();
}

export function nearestPatient(score: number, patients: CohortPatient[]): CohortPatient | null {
  if (patients.length === 0) return null;
  return patients.reduce((best, p) =>
    Math.abs(p.risk - score) < Math.abs(best.risk - score) ? p : best
  );
}
