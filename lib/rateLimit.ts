type Bucket = { count: number; resetAt: number };

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number
  ) {}

  exceeded(clientId: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(clientId);

    if (!bucket || now > bucket.resetAt) {
      this.buckets.set(clientId, { count: 1, resetAt: now + this.windowMs });
      this.evictExpired(now);
      return false;
    }

    bucket.count += 1;
    return bucket.count > this.max;
  }

  private evictExpired(now: number): void {
    for (const [id, bucket] of this.buckets) {
      if (now > bucket.resetAt) this.buckets.delete(id);
    }
  }
}

export function clientIdOf(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function readJsonBody(req: Request): Promise<unknown | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
