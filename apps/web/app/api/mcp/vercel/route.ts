import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

const VERCEL_API_BASE = "https://api.vercel.com";

export async function POST(req: NextRequest) {
  try {
    const headersList = headers();
    const token = headersList.get("x-connector-token");
    
    if (!token) {
      return NextResponse.json({ error: "Token Vercel manquant" }, { status: 401 });
    }

    const { action, ...params } = await req.json();
    const vercelHeaders = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };

    switch (action) {
      case "verify":
        const userRes = await fetch(`${VERCEL_API_BASE}/v2/user`, { headers: vercelHeaders });
        if (!userRes.ok) throw new Error("Token Vercel invalide");
        const userData = await userRes.json();
        return NextResponse.json({ 
          success: true, 
          data: { username: userData.username, email: userData.email, id: userData.id }
        });

      case "projects":
        const projectsRes = await fetch(`${VERCEL_API_BASE}/v9/projects`, { headers: vercelHeaders });
        const projects = await projectsRes.json();
        return NextResponse.json({ 
          success: true, 
          data: projects.projects?.map((p: any) => ({ 
            id: p.id, name: p.name, framework: p.framework 
          })) || []
        });

      case "deployments":
        const { project } = params;
        const deploymentsRes = await fetch(
          `${VERCEL_API_BASE}/v6/deployments${project ? `?projectId=${project}` : ''}`, 
          { headers: vercelHeaders }
        );
        const deployments = await deploymentsRes.json();
        return NextResponse.json({ 
          success: true, 
          data: deployments.deployments?.map((d: any) => ({ 
            uid: d.uid, url: d.url, state: d.state, created: d.created 
          })) || []
        });

      default:
        return NextResponse.json({ error: `Action '${action}' non supportée` }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Vercel MCP Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Erreur inconnue" 
    }, { status: 500 });
  }
}
