import { NextRequest, NextResponse } from "next/server";

const VPS_URL = "http://46.225.103.230:3100";
const VPS_KEY = "changeme";

// Hetzner API
const HETZNER_API = "https://api.hetzner.cloud/v1";
const HETZNER_SERVER_NAME = "s-rank-agent";

async function getHetznerToken(): Promise<string | null> {
  return process.env.HETZNER_API_TOKEN || null;
}

async function findServerId(token: string): Promise<number | null> {
  const res = await fetch(`${HETZNER_API}/servers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const server = data.servers?.find((s: any) => s.name === HETZNER_SERVER_NAME);
  return server?.id || null;
}

// GET /api/vps — status check
export async function GET() {
  const checks: any = { vps_api: false, ssh: false, hetzner: null, timestamp: Date.now() };

  // Check VPS API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${VPS_URL}/health`, {
      headers: { "x-api-key": VPS_KEY },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    checks.vps_api = res.ok;
  } catch {
    checks.vps_api = false;
  }

  // Check Hetzner status
  const token = await getHetznerToken();
  if (token) {
    try {
      const serverId = await findServerId(token);
      if (serverId) {
        const res = await fetch(`${HETZNER_API}/servers/${serverId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          checks.hetzner = {
            id: data.server.id,
            status: data.server.status,
            ip: data.server.public_net?.ipv4?.ip,
            type: data.server.server_type?.name,
          };
        }
      }
    } catch {}
  }

  return NextResponse.json(checks);
}

// POST /api/vps — actions (reboot, poweroff, poweron)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body; // "reboot" | "reset" | "poweroff" | "poweron"

  if (!["reboot", "reset", "poweroff", "poweron"].includes(action)) {
    return NextResponse.json({ error: "Action invalide. Utilise: reboot, reset, poweroff, poweron" }, { status: 400 });
  }

  // Get Hetzner token
  const token = body.hetznerToken || await getHetznerToken();
  if (!token) {
    return NextResponse.json({ error: "HETZNER_API_TOKEN non configuré. Ajoute-le dans Settings ou en variable d'environnement Vercel." }, { status: 400 });
  }

  // Find server
  const serverId = await findServerId(token);
  if (!serverId) {
    return NextResponse.json({ error: `Serveur "${HETZNER_SERVER_NAME}" non trouvé sur Hetzner` }, { status: 404 });
  }

  // Execute action
  try {
    const hetznerAction = action === "reboot" ? "reboot" : action === "reset" ? "reset" : action === "poweroff" ? "poweroff" : "poweron";
    const res = await fetch(`${HETZNER_API}/servers/${serverId}/actions/${hetznerAction}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.error?.message || `Hetzner error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({
      ok: true,
      action: hetznerAction,
      status: data.action?.status,
      progress: data.action?.progress,
      message: `Serveur ${hetznerAction} en cours...`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
