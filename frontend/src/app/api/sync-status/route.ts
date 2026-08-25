import { NextResponse } from "next/server";
import { syncQueue } from "@/lib/backend-state";

export async function GET() {
  return NextResponse.json(syncQueue);
}
