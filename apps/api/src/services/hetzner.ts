import { db } from "../db";
import { servers, activityLogs } from "../db/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

const HETZNER_API = "https://api.hetzner.cloud/v1";
const HETZNER_TOKEN = process.env.HETZNER_API_TOKEN;

const SIZE_MAP: Record<string, string> = {
  starter: "cx22",  // 2 vCPU, 4GB RAM
  pro: "cx32",      // 4 vCPU, 8GB RAM
  business: "cx42", // 8 vCPU, 16GB RAM
};

interface HetznerResponse {
  server: {
    id: number;
    public_net: {
      ipv4: { ip: string };
      ipv6: { ip: string };
    };
    status: string;
  };
}

export class HetznerService {
  private async request(method: string, path: string, body?: unknown) {
    const res = await fetch(`${HETZNER_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${HETZNER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Hetzner API error: ${res.status} ${err}`);
    }

    return res.json();
  }

  async provision(userId: string, size: string): Promise<string> {
    const serverType = SIZE_MAP[size];
    if (!serverType) throw new Error(`Invalid server size: ${size}`);

    // Check for existing server
    const existing = await db.query.servers.findFirst({
      where: eq(servers.userId, userId),
    });
    if (existing) throw new Error("Server already exists for this user");

    // Read cloud-init
    let cloudInit = "";
    try {
      cloudInit = fs.readFileSync(
        path.join(process.cwd(), "../../infra/hetzner/cloud-init.yml"),
        "utf-8"
      );
    } catch {
      cloudInit = "#!/bin/bash\napt-get update\napt-get install -y docker.io nodejs npm git";
    }

    // Create DB record first
    const [serverRecord] = await db
      .insert(servers)
      .values({
        userId,
        name: `srank-${userId.slice(0, 8)}`,
        plan: size as any,
        status: "provisioning",
      })
      .returning();

    try {
      // Create Hetzner server
      const data: HetznerResponse = await this.request("POST", "/servers", {
        name: `srank-${userId.slice(0, 8)}-${Date.now()}`,
        server_type: serverType,
        image: "ubuntu-24.04",
        location: "nbg1", // Nuremberg
        user_data: cloudInit,
        labels: {
          service: "s-rank-agent",
          userId: userId.slice(0, 16),
        },
      });

      // Update DB with Hetzner info
      await db
        .update(servers)
        .set({
          hetznerServerId: data.server.id.toString(),
          ipv4: data.server.public_net.ipv4.ip,
          ipv6: data.server.public_net.ipv6.ip,
          status: "starting",
        })
        .where(eq(servers.id, serverRecord.id));

      // Log
      await db.insert(activityLogs).values({
        userId,
        action: "server_action",
        status: "success",
        description: `Server provisioned: ${serverType} (${size})`,
      });

      // Poll for ready status (async)
      this.waitForReady(serverRecord.id, data.server.id.toString()).catch(
        console.error
      );

      return serverRecord.id;
    } catch (error: any) {
      await db
        .update(servers)
        .set({ status: "error" })
        .where(eq(servers.id, serverRecord.id));

      throw error;
    }
  }

  private async waitForReady(dbServerId: string, hetznerServerId: string) {
    const maxAttempts = 60; // 5 minutes
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));

      const data = await this.request("GET", `/servers/${hetznerServerId}`);

      if (data.server.status === "running") {
        await db
          .update(servers)
          .set({ status: "running" })
          .where(eq(servers.id, dbServerId));
        return;
      }
    }

    await db
      .update(servers)
      .set({ status: "error" })
      .where(eq(servers.id, dbServerId));
  }

  async start(userId: string) {
    const server = await this.getServer(userId);
    await this.request("POST", `/servers/${server.hetznerServerId}/actions/poweron`);
    await db.update(servers).set({ status: "starting" }).where(eq(servers.id, server.id));
  }

  async stop(userId: string) {
    const server = await this.getServer(userId);
    await this.request("POST", `/servers/${server.hetznerServerId}/actions/shutdown`);
    await db.update(servers).set({ status: "stopped" }).where(eq(servers.id, server.id));
  }

  async destroy(userId: string) {
    const server = await this.getServer(userId);
    await this.request("DELETE", `/servers/${server.hetznerServerId}`);
    await db.update(servers).set({ status: "deleted" }).where(eq(servers.id, server.id));
  }

  private async getServer(userId: string) {
    const server = await db.query.servers.findFirst({
      where: eq(servers.userId, userId),
    });
    if (!server || !server.hetznerServerId) {
      throw new Error("No server found");
    }
    return server;
  }
}

export const hetznerService = new HetznerService();
