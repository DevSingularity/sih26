import { NextRequest, NextResponse } from "next/server";
import { cargoItems, cargoMovementEvents } from "@/lib/backend-state";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const item = cargoItems.find((c) => c.id === id);
  if (!item) {
    return NextResponse.json({ error: "Cargo item not found" }, { status: 404 });
  }
  const event = {
    id: `evt-${String(cargoMovementEvents.length + 1).padStart(3, "0")}`,
    cargoItemId: id,
    fromLocation: item.currentLocation,
    toLocation: body.toLocation,
    timestamp: new Date().toISOString(),
    recordedBy: body.recordedBy,
  };
  cargoMovementEvents.push(event);
  item.currentLocation = body.toLocation;
  item.custodyState = "INWARD";
  return NextResponse.json({ ok: true, event });
}
