import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// GET - Load agent mode
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await sql`SELECT agent_mode FROM users WHERE clerk_id = ${userId}`;
    const mode = rows[0]?.agent_mode || "on-demand";
    return NextResponse.json({ mode });
  } catch (e: any) {
    // Column might not exist yet - return default
    return NextResponse.json({ mode: "on-demand" });
  }
}

// POST - Save agent mode
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { mode } = await req.json();
    if (!["on-demand", "always-on"].includes(mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    // Try to update - if column doesn't exist, add it first
    try {
      await sql`UPDATE users SET agent_mode = ${mode} WHERE clerk_id = ${userId}`;
    } catch {
      // Column doesn't exist yet, create it then update
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_mode TEXT DEFAULT 'on-demand'`;
      await sql`UPDATE users SET agent_mode = ${mode} WHERE clerk_id = ${userId}`;
    }

    return NextResponse.json({ mode, saved: true });
  } catch (e: any) {
    // Even if DB fails, acknowledge the request
    return NextResponse.json({ mode: "on-demand", saved: false, error: e.message });
  }
}
