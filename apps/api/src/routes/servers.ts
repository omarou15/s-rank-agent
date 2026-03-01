import { Hono } from "hono";
import { db } from "../db";
import { servers } from "../db/schema";
import { eq } from "drizzle-orm";
import { SERVER_PLANS } from "@s-rank/shared";

export const serverRoutes = new Hono();

const HETZNER_API = "https://api.hetzner.cloud/v1";
const HETZNER_TOKEN = process.env.HETZNER_API_TOKEN;

const HETZNER_SERVER_TYPES: Record<string, string> = {
  starter: "cx22",   // 1 vCPU, 2GB RAM — closest to our spec
  pro: "cx32",       // 2 vCPU, 4GB RAM
  business: "cx42",  // 4 vCPU, 8GB RAM
};

// ── Get server status ──
serverRoutes.get("/status", async (c) => {
  const userId = c.get("userId");

  const server = await db.query.servers.findFirst({
    where: eq(servers.userId, userId),
  });

  if (!server) {
    return c.json({ server: null, message: "No server provisioned" });
  }

  return c.json({ server });
});

// ── Provision a new server ──
serverRoutes.post("/provision", async (c) => {
  const userId = c.get("userId");
  const { size } = await c.req.json();

  if (!["starter", "pro", "business"].includes(size)) {
    return c.json({ error: "Invalid server size" }, 400);
  }

  // Check if user already has a server
  const existing = await db.query.servers.findFirst({
    where: eq(servers.userId, userId),
  });

  if (existing && existing.status !== "error") {
    return c.json({ error: "User already has a server" }, 400);
  }

  // Create DB record first
  const [server] = await db
    .insert(servers)
    .values({
      userId,
      name: `s-rank-${userId.slice(0, 8)}`,
      size,
      status: "provisioning",
      specs: SERVER_PLANS[size as keyof typeof SERVER_PLANS],
    })
    .returning();

  // Provision on Hetzner (async)
  provisionHetznerServer(server.id, size).catch((err) => {
    console.error(`[SERVER] Failed to provision: ${err.message}`);
  });

  return c.json({ server }, 201);
});

// ── Stop server ──
serverRoutes.post("/stop", async (c) => {
  const userId = c.get("userId");

  const server = await db.query.servers.findFirst({
    where: eq(servers.userId, userId),
  });

  if (!server?.hetznerId) {
    return c.json({ error: "No server to stop" }, 400);
  }

  await fetch(`${HETZNER_API}/servers/${server.hetznerId}/actions/shutdown`, {
    method: "POST",
    headers: { Authorization: `Bearer ${HETZNER_TOKEN}` },
  });

  await db.update(servers).set({ status: "stopped" }).where(eq(servers.id, server.id));

  return c.json({ success: true });
});

// ── Start server ──
serverRoutes.post("/start", async (c) => {
  const userId = c.get("userId");

  const server = await db.query.servers.findFirst({
    where: eq(servers.userId, userId),
  });

  if (!server?.hetznerId) {
    return c.json({ error: "No server to start" }, 400);
  }

  await fetch(`${HETZNER_API}/servers/${server.hetznerId}/actions/poweron`, {
    method: "POST",
    headers: { Authorization: `Bearer ${HETZNER_TOKEN}` },
  });

  await db.update(servers).set({ status: "running" }).where(eq(servers.id, server.id));

  return c.json({ success: true });
});

// ── Get server metrics ──
serverRoutes.get("/metrics", async (c) => {
  const userId = c.get("userId");

  const server = await db.query.servers.findFirst({
    where: eq(servers.userId, userId),
  });

  if (!server || server.status !== "running") {
    return c.json({ error: "Server not running" }, 400);
  }

  try {
    const { sshService } = await import("../services/ssh");
    const metrics = await sshService.getMetrics(userId);
    return c.json({ metrics });
  } catch (err: any) {
    return c.json({
      error: "Failed to get metrics",
      metrics: { cpuPercent: 0, ramUsedMb: 0, ramTotalMb: 0, diskUsedGb: 0, diskTotalGb: 0, uptimeSeconds: 0 },
    });
  }
});

// ── Async Hetzner provisioning ──
async function provisionHetznerServer(serverId: string, size: string) {
  const cloudInit = `#cloud-config
package_update: true
packages:
  - docker.io
  - docker-compose
  - python3
  - python3-pip
  - nodejs
  - npm
  - git
  - curl
  - htop

runcmd:
  - systemctl enable docker
  - systemctl start docker
  - mkdir -p /home/agent/projects
  - mkdir -p /home/agent/downloads
  - mkdir -p /home/agent/workspace
  - echo "S-Rank Agent server ready" > /home/agent/README.md
  - docker pull ubuntu:24.04
`;

  try {
    const response = await fetch(`${HETZNER_API}/servers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HETZNER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `s-rank-${serverId.slice(0, 8)}`,
        server_type: HETZNER_SERVER_TYPES[size] || "cx22",
        image: "ubuntu-24.04",
        location: "fsn1", // Falkenstein, Germany
        user_data: cloudInit,
        labels: {
          service: "s-rank-agent",
          server_id: serverId,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hetzner API error: ${error}`);
    }

    const data = await response.json();
    const hetznerServer = data.server;

    // Update DB with Hetzner details
    await db
      .update(servers)
      .set({
        hetznerId: hetznerServer.id,
        ipv4: hetznerServer.public_net?.ipv4?.ip || null,
        ipv6: hetznerServer.public_net?.ipv6?.ip || null,
        status: "running",
        updatedAt: new Date(),
      })
      .where(eq(servers.id, serverId));

    console.log(`[SERVER] Provisioned: ${hetznerServer.id} (${hetznerServer.public_net?.ipv4?.ip})`);
  } catch (error: any) {
    console.error(`[SERVER] Provisioning failed:`, error.message);
    await db
      .update(servers)
      .set({ status: "error", updatedAt: new Date() })
      .where(eq(servers.id, serverId));
  }
}
