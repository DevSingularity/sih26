import { NextResponse } from "next/server";
import { riskAlerts } from "@/lib/backend-state";

export async function GET() {
  return NextResponse.json(riskAlerts);
}
