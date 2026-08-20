import type { Assessment } from "./contract";

const PENDING_KEY = "medxplain.pendingAssessment";
const LATEST_KEY = "medxplain.latestAssessment";
const LATEST_NOTE_KEY = "medxplain.latestNote";

export type PendingAssessment = { note: string; model: string };

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
}

export function setPendingAssessment(value: PendingAssessment): void {
  writeJson(PENDING_KEY, value);
}

export function getPendingAssessment(): PendingAssessment | null {
  return readJson<PendingAssessment>(PENDING_KEY);
}

export function clearPendingAssessment(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_KEY);
}

export function setLatestAssessment(value: Assessment): void {
  writeJson(LATEST_KEY, value);
}

export function getLatestAssessment(): Assessment | null {
  return readJson<Assessment>(LATEST_KEY);
}

export function clearLatestAssessment(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(LATEST_KEY);
  window.sessionStorage.removeItem(LATEST_NOTE_KEY);
}

export function setLatestNote(note: string): void {
  writeJson(LATEST_NOTE_KEY, note);
}

export function getLatestNote(): string {
  return readJson<string>(LATEST_NOTE_KEY) ?? "";
}

export function resetAssessmentSession(): void {
  clearPendingAssessment();
  clearLatestAssessment();
}
