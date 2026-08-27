const QUALIFIERS =
  /\b(?:elevated|raised|increased|high|low|reduced|decreased|severe|mild|moderate|current|former|chronic|history|of|the|a|status|level|value|class)\b/g;

const ALIASES: Record<string, string> = {
  crp: "creactive",
  creactive: "creactive",
  protein: "creactive",
  probnp: "probnp",
  bnp: "probnp",
  smoker: "smoking",
  smoking: "smoking",
  diabetes: "diabetes",
  diabetic: "diabetes",
  cad: "coronary",
  coronary: "coronary",
};

function keysOf(name: string): Set<string> {
  const cleaned = name
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(QUALIFIERS, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const keys = new Set<string>();
  for (const token of cleaned.split(" ")) {
    if (token.length >= 3) keys.add(ALIASES[token] ?? token);
  }
  return keys;
}

function intersects(a: Set<string>, b: Set<string>): boolean {
  for (const key of a) if (b.has(key)) return true;
  return false;
}

export type FactorOverlap = { left: Set<string>; right: Set<string> };

export function overlappingFactors(leftNames: string[], rightNames: string[]): FactorOverlap {
  const left = leftNames.map((name) => ({ name, keys: keysOf(name) }));
  const right = rightNames.map((name) => ({ name, keys: keysOf(name) }));

  return {
    left: new Set(
      left.filter((l) => right.some((r) => intersects(l.keys, r.keys))).map((l) => l.name)
    ),
    right: new Set(
      right.filter((r) => left.some((l) => intersects(l.keys, r.keys))).map((r) => r.name)
    ),
  };
}
