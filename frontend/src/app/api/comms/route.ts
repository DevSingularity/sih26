import { NextRequest, NextResponse } from "next/server";
import { commsLog } from "@/lib/backend-state";

export async function GET() {
  return NextResponse.json(commsLog);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const entry = {
    id: `comms-${String(commsLog.length + 1).padStart(3, "0")}`,
    direction: body.direction,
    message: body.message,
    timestamp: new Date().toISOString(),
  };
  commsLog.push(entry);
  return NextResponse.json(entry);
}
