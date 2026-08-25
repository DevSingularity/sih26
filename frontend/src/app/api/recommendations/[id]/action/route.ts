import { NextRequest, NextResponse } from "next/server";
import { recommendations } from "@/lib/backend-state";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const recommendation = recommendations.find((r) => r.id === id);
  if (!recommendation) {
    return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
  }
  recommendation.status = body.status;
  return NextResponse.json({ ok: true, recommendation });
}
