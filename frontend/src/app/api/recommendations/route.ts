import { NextResponse } from "next/server";
import { recommendations } from "@/lib/backend-state";

export async function GET() {
  return NextResponse.json(recommendations);
}
