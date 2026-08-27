export type ClientFacingError = { status: number; error: string };

export function clientFacingError(message: string): ClientFacingError {
  const lower = message.toLowerCase();

  if (message.includes("(429)")) {
    return { status: 429, error: "The model provider is rate limited. Please retry in a moment." };
  }
  if (lower.includes("timeout") || lower.includes("aborted")) {
    return { status: 504, error: "The request timed out. Please try again." };
  }
  if (lower.includes("not configured")) {
    return { status: 503, error: "The model is not configured on this server." };
  }
  if (lower.includes("supported")) {
    return { status: 400, error: "That model is not available." };
  }
  return { status: 502, error: "The model could not complete the request. Please try again." };
}
