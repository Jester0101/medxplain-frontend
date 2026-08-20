import { NextResponse } from "next/server";
import { MODEL_CATALOGUE } from "@/lib/presets";

export async function GET() {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);

  const models = MODEL_CATALOGUE.map((m) => {
    const isGemini = m.id.startsWith("gemini-");
    if (isGemini) {
      return {
        ...m,
        available: hasGeminiKey,
        note: hasGeminiKey ? undefined : "Set GEMINI_API_KEY to enable",
      };
    }
    return { ...m, available: false, note: "Needs the self-hosted model server" };
  });

  return NextResponse.json({ models });
}
