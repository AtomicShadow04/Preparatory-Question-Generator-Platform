import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    message: "Test endpoint is working",
    timestamp: new Date().toISOString(),
  });
}
