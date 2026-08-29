"use client";
import { useId, useState } from "react";
import { motion } from "framer-motion";
import { attributionMap, formatPp, signedValue, type Assessment, type Factor } from "@/lib/contract";
import { useMeasuredWidth } from "@/lib/useMeasuredWidth";
import { truncate } from "@/lib/utils";


type Segment = { f: Factor; v: number; x: number; w: number };

export function ForcePlot({ assessment }: { assessment: Assessment }) {
  const uid = useId().replace(/[«»:]/g, "");
  const [active, setActive] = useState<Segment | null>(null);
  const { ref, width } = useMeasuredWidth<HTMLDivElement>(600);

  const factors = assessment.factors;
  const phi = attributionMap(assessment);
  const ups = factors.filter((f) => signedValue(f) > 0)
    .sort((a, b) => Math.abs(signedValue(a)) - Math.abs(signedValue(b)));
  const downs = factors.filter((f) => signedValue(f) < 0)
    .sort((a, b) => Math.abs(signedValue(b)) - Math.abs(signedValue(a)));

  const sumUp = ups.reduce((s, f) => s + Math.abs(signedValue(f)), 0);
  const sumDown = downs.reduce((s, f) => s + Math.abs(signedValue(f)), 0);
  const total = sumUp + sumDown;
  if (total === 0) {
    return <p className="text-sm text-muted-foreground">No factors to display.</p>;
  }

  const W = Math.max(260, Math.round(width));
  const compact = W < 460;
  const H = compact ? 138 : 152;
  const barY = compact ? 52 : 62;
  const barH = compact ? 30 : 34;
  const meet = (sumUp / total) * W;

  let cx = 0;
  const segments: Segment[] = [];
  for (const f of [...ups, ...downs]) {
    const v = signedValue(f);
    const w = (Math.abs(v) / total) * W;
    segments.push({ f, v, x: cx, w });
    cx += w;
  }

  const pillText = assessment.riskScore;
  const pillW = pillText.length * 8.5 + 22;
  const pillX = Math.min(Math.max(meet - pillW / 2, 4), W - pillW - 4);
  const pillY = 14;

  return (
    <div className="space-y-2" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full" role="img"
           aria-label={`Force plot: contributions meeting at predicted risk ${assessment.riskScore}`}>
        <defs>
          <clipPath id={`${uid}-bar`}>
            <rect x="0" y={barY} width={W} height={barH} rx="12" />
          </clipPath>
        </defs>

        <circle cx={5} cy={barY - 12} r="3" fill="var(--risk-up)" />
        <text x={13} y={barY - 8.5} fontSize="11" fill="var(--muted-foreground)">
          raises →
        </text>
        <circle cx={W - 78} cy={barY - 12} r="3" fill="var(--risk-down)" />
        <text x={W - 70} y={barY - 8.5} fontSize="11" fill="var(--muted-foreground)">
          ← lowers
        </text>

        <g
          clipPath={`url(#${uid}-bar)`}
          onMouseLeave={() => setActive(null)}
        >
          {segments.map((s, i) => {
            const up = s.v > 0;
            const isActive = active?.f.name === s.f.name;
            const dimmed = active !== null && !isActive;
            return (
              <g
                key={`${s.f.name}-${i}`}
                tabIndex={0}
                className="cursor-pointer outline-none"
                onMouseEnter={() => setActive(s)}
                onFocus={() => setActive(s)}
                onBlur={() => setActive(null)}
                role="img"
                aria-label={`${s.f.name}: ${s.f.impact}`}
                style={{
                  opacity: dimmed ? 0.4 : 1,
                  transition: "opacity 150ms ease",
                }}
              >
                <motion.rect
                  x={s.x}
                  y={barY}
                  width={s.w}
                  height={barH}
                  fill={up ? "var(--risk-up)" : "var(--risk-down)"}
                  stroke="var(--card)"
                  strokeWidth="2.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.05 + i * 0.045 }}
                />
              </g>
            );
          })}
        </g>

        {segments.map((s, i) =>
          s.w > 62 ? (
            <text key={`lbl-${i}`} x={s.x + s.w / 2} y={barY + barH + 17} textAnchor="middle"
                  fontSize="11" fill="var(--muted-foreground)" className="capitalize">
              {truncate(s.f.name, Math.floor(s.w / 6.5))}
            </text>
          ) : null
        )}

        <motion.g initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          <line x1={meet} y1={pillY + 26} x2={meet} y2={barY + barH + 2}
                stroke="var(--foreground)" strokeWidth="2" opacity="0.55" />
          <rect x={pillX} y={pillY} width={pillW} height="26" rx="13"
                fill="var(--foreground)" />
          <text x={pillX + pillW / 2} y={pillY + 17.5} textAnchor="middle" fontSize="13"
                fontWeight="700" fill="var(--background)" className="tabular-nums">
            {pillText}
          </text>
        </motion.g>
      </svg>

      <div className="grid h-12">
        <div
          className="col-start-1 row-start-1 text-sm leading-relaxed text-muted-foreground transition-opacity duration-150"
          style={{ opacity: active ? 1 : 0, pointerEvents: active ? "auto" : "none" }}
          aria-hidden={!active}
        >
          {active && (
            <p>
              <b className="capitalize text-foreground">{active.f.name}</b>
              {active.f.value !== "present" ? ` (${active.f.value})` : ""}
              {" — "}
              {active.f.impact}{" "}
              <span className="font-mono font-medium tabular-nums"
                    style={{ color: active.v > 0 ? "var(--risk-up)" : "var(--risk-down)" }}>
                {active.v > 0 ? "+" : "−"}{formatPp(phi.get(active.f) ?? 0, [...phi.values()])}
              </span>
            </p>
          )}
        </div>
        <p
          className="col-start-1 row-start-1 text-sm leading-relaxed text-muted-foreground transition-opacity duration-150"
          style={{ opacity: active ? 0 : 1, pointerEvents: active ? "none" : "auto" }}
          aria-hidden={!!active}
        >
          Hover or focus a segment to see its contribution.
        </p>
      </div>
    </div>
  );
}
