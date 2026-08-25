import { NextRequest, NextResponse } from "next/server";
import { cargoItems } from "@/lib/backend-state";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const expeditionId = searchParams.get("expeditionId");
  if (expeditionId) {
    return NextResponse.json(cargoItems.filter((c) => c.expeditionId === expeditionId));
  }
  return NextResponse.json(cargoItems);
}
