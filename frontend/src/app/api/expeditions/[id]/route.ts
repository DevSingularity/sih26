import { NextRequest, NextResponse } from "next/server";
import { expeditions, cargoItems, shipmentTracks } from "@/lib/backend-state";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const expedition = expeditions.find((e) => e.id === id);
  if (!expedition) {
    return NextResponse.json({ error: "Expedition not found" }, { status: 404 });
  }
  const cargo = cargoItems.filter((c) => c.expeditionId === id);
  const shipments = shipmentTracks.filter((s) => s.expeditionId === id);
  return NextResponse.json({ ...expedition, cargo, shipments });
}
