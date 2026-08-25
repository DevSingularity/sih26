import { NextRequest, NextResponse } from "next/server";
import { shipmentTracks } from "@/lib/backend-state";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const expeditionId = searchParams.get("expeditionId");
  if (expeditionId) {
    return NextResponse.json(shipmentTracks.filter((s) => s.expeditionId === expeditionId));
  }
  return NextResponse.json(shipmentTracks);
}
