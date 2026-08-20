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
