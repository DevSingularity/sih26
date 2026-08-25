import { NextRequest, NextResponse } from "next/server";
import { expeditions } from "@/lib/backend-state";

export async function GET() {
  return NextResponse.json(expeditions);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const newExpedition = {
    id: `exp-${String(expeditions.length + 1).padStart(3, "0")}`,
    name: body.name,
    route: body.route,
    startDate: body.startDate,
    status: "PLANNED" as const,
    createdBy: body.createdBy,
    personnelAssigned: body.personnelAssigned,
    cargoRequirementSummary: body.cargoRequirementSummary,
  };
  expeditions.push(newExpedition);
  return NextResponse.json(newExpedition);
}
