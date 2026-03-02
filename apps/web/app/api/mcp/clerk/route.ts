import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

const CLERK_API_BASE = "https://api.clerk.dev/v1";

export async function POST(req: NextRequest) {
  try {
    const headersList = headers();
    const token = headersList.get("x-connector-token");
    
    if (!token) {
      return NextResponse.json({ error: "Token Clerk manquant" }, { status: 401 });
    }

    const { action, ...params } = await req.json();
    const clerkHeaders = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };

    switch (action) {
      case "verify":
        const usersRes = await fetch(`${CLERK_API_BASE}/users?limit=1`, { headers: clerkHeaders });
        if (!usersRes.ok) throw new Error("Token Clerk invalide");
        const usersData = await usersRes.json();
        return NextResponse.json({ 
          success: true, 
          data: { total_count: usersData.total_count || 0 }
        });

      case "users":
        const allUsersRes = await fetch(`${CLERK_API_BASE}/users?limit=100`, { headers: clerkHeaders });
        const allUsers = await allUsersRes.json();
        return NextResponse.json({ 
          success: true, 
          data: allUsers.map((u: any) => ({ 
            id: u.id, 
            email: u.email_addresses?.[0]?.email_address,
            first_name: u.first_name,
            last_name: u.last_name,
            created_at: u.created_at,
            banned: u.banned
          }))
        });

      case "ban":
        const { userId } = params;
        if (!userId) throw new Error("userId requis");
        
        const banRes = await fetch(`${CLERK_API_BASE}/users/${userId}/ban`, {
          method: "POST",
          headers: clerkHeaders
        });
        const banData = await banRes.json();
        return NextResponse.json({ success: true, data: banData });

      case "unban":
        const { userId: unbanUserId } = params;
        if (!unbanUserId) throw new Error("userId requis");
        
        const unbanRes = await fetch(`${CLERK_API_BASE}/users/${unbanUserId}/unban`, {
          method: "POST",
          headers: clerkHeaders
        });
        const unbanData = await unbanRes.json();
        return NextResponse.json({ success: true, data: unbanData });

      case "sessions":
        const sessionsRes = await fetch(`${CLERK_API_BASE}/sessions?limit=100`, { headers: clerkHeaders });
        const sessions = await sessionsRes.json();
        return NextResponse.json({ 
          success: true, 
          data: sessions.map((s: any) => ({ 
            id: s.id, user_id: s.user_id, status: s.status, created_at: s.created_at 
          }))
        });

      default:
        return NextResponse.json({ error: `Action '${action}' non supportée` }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Clerk MCP Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Erreur inconnue" 
    }, { status: 500 });
  }
}
