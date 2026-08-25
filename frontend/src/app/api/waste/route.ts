import { NextRequest, NextResponse } from "next/server";
import { wasteLogs } from "@/lib/backend-state";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const station = searchParams.get("station");
  if (station) {
    return NextResponse.json(wasteLogs.filter((w) => w.station === station));
  }
  return NextResponse.json(wasteLogs);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const entry = {
    id: `waste-${String(wasteLogs.length + 1).padStart(3, "0")}`,
    station: body.station,
    category: body.category,
    quantityKg: body.quantityKg,
    method: body.method,
    loggedAt: new Date().toISOString(),
  };
  wasteLogs.push(entry);
  return NextResponse.json(entry);
}
