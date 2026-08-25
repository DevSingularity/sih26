import { NextRequest, NextResponse } from "next/server";
import { sosEvents, alerts } from "@/lib/backend-state";

export async function GET() {
  return NextResponse.json(sosEvents);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (body.operationId && sosEvents.some((s) => s.id === body.operationId)) {
    return NextResponse.json({ ok: true, deduplicated: true });
  }
  const event = {
    id: body.operationId || `sos-${String(sosEvents.length + 1).padStart(3, "0")}`,
    station: body.station,
    triggeredAt: new Date().toISOString(),
    syncStatus: "PENDING" as const,
    escalated: true,
  };
  sosEvents.push(event);
  alerts.push({
    id: `alert-${Date.now()}`,
    severity: "critical",
    message: `SOS event from ${body.station}`,
    timestamp: event.triggeredAt,
    sos: true,
  });
  return NextResponse.json(event);
}
