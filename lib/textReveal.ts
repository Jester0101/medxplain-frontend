export const WORD_ANIM_MS = 420;

export function wordStepMs(totalWords: number): number {
  return Math.max(6, Math.min(26, 900 / Math.max(totalWords, 1)));
}

export function revealDurationMs(totalWords: number): number {
  if (totalWords <= 0) return 0;
  return (totalWords - 1) * wordStepMs(totalWords) + WORD_ANIM_MS;
}
