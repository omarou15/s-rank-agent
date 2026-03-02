import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  // For now, return default — in production this would read from DB
  return NextResponse.json({ mode: "on-demand" });
}

export async function POST(req: NextRequest) {
  try {
    const { mode } = await req.json();
    if (!["on-demand", "always-on"].includes(mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }
    // TODO: Save to DB per user (need Clerk auth)
    return NextResponse.json({ mode, saved: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
