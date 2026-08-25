import { NextRequest, NextResponse } from "next/server";
import { fieldUpdates } from "@/lib/backend-state";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const station = searchParams.get("station");
  if (station) {
    return NextResponse.json(fieldUpdates.filter((f) => f.station === station));
  }
  return NextResponse.json(fieldUpdates);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (body.operationId && fieldUpdates.some((f) => f.id === body.operationId)) {
    return NextResponse.json({ ok: true, deduplicated: true });
  }
  const entry = {
    id: body.operationId || `fu-${String(fieldUpdates.length + 1).padStart(3, "0")}`,
    station: body.station,
    activity: body.activity,
    siteConditions: body.siteConditions,
    notes: body.notes,
    loggedAt: new Date().toISOString(),
    syncStatus: "PENDING" as const,
  };
  fieldUpdates.push(entry);
  return NextResponse.json(entry);
}
