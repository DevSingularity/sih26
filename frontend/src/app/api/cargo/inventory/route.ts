import { NextRequest, NextResponse } from "next/server";
import { inventorySnapshots } from "@/lib/backend-state";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const station = searchParams.get("station");
  if (station) {
    return NextResponse.json(inventorySnapshots.filter((s) => s.station === station));
  }
  return NextResponse.json(inventorySnapshots);
}
