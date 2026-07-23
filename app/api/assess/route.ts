import { NextResponse } from "next/server";
import { AssessRequestSchema } from "@/lib/contract";
import { mockAssessment } from "@/lib/mock";

export async function POST(req: Request) {
  const parsed = AssessRequestSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  await new Promise(r => setTimeout(r, 900));
  return NextResponse.json(mockAssessment(parsed.data.note, parsed.data.model));
}
