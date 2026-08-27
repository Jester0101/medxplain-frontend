export type SwarmInput<T> = { x: number; datum: T };
export type SwarmPoint<T> = { x: number; y: number; datum: T };

function nearestFree(intervals: [number, number][]): number {
  const candidates = [0];
  for (const [lo, hi] of intervals) candidates.push(lo, hi);

  let bestY = 0;
  let bestDistance = Infinity;
  for (const c of candidates) {
    let blocked = false;
    for (const [lo, hi] of intervals) {
      if (c > lo + 1e-9 && c < hi - 1e-9) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;
    const distance = Math.abs(c);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestY = c;
    }
  }
  return bestY;
}

export function packSwarm<T>(values: SwarmInput<T>[], radius: number): SwarmPoint<T>[] {
  const diameter = radius * 2;
  const ordered = [...values].sort((a, b) => a.x - b.x);
  const placed: SwarmPoint<T>[] = [];

  for (const value of ordered) {
    const intervals: [number, number][] = [];
    for (const p of placed) {
      const dx = p.x - value.x;
      if (Math.abs(dx) >= diameter) continue;
      const dy = Math.sqrt(diameter * diameter - dx * dx);
      intervals.push([p.y - dy, p.y + dy]);
    }
    placed.push({ x: value.x, y: intervals.length ? nearestFree(intervals) : 0, datum: value.datum });
  }

  return placed;
}
