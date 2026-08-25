import { NextRequest, NextResponse } from "next/server";
import { locationUpdates } from "@/lib/backend-state";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const station = searchParams.get("station");
  if (station) {
    return NextResponse.json(locationUpdates.filter((l) => l.station === station));
  }
  return NextResponse.json(locationUpdates);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (body.operationId && locationUpdates.some((l) => l.id === body.operationId)) {
    return NextResponse.json({ ok: true, deduplicated: true });
  }
  const entry = {
    id: body.operationId || `loc-${String(locationUpdates.length + 1).padStart(3, "0")}`,
    station: body.station,
    lat: body.lat,
    lon: body.lon,
    sharedAt: new Date().toISOString(),
    syncStatus: "PENDING" as const,
  };
  locationUpdates.push(entry);
  return NextResponse.json(entry);
}
