import { NextRequest, NextResponse } from "next/server";
import { cargoMovementEvents } from "@/lib/backend-state";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const events = cargoMovementEvents.filter((e) => e.cargoItemId === id);
  return NextResponse.json(events);
}
