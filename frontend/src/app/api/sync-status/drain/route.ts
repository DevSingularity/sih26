import { NextRequest, NextResponse } from "next/server";
import { syncQueue } from "@/lib/backend-state";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const station = body.station;
  syncQueue
    .filter((item) => item.station === station && item.status === "PENDING")
    .forEach((item) => {
      item.status = "SYNCED";
    });
  return NextResponse.json({ ok: true });
}
