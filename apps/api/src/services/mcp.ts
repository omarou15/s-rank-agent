import { db } from "../db";
import { connectors } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "../utils/crypto";

export interface MCPAction {
  connector: string;
  action: string;
  params: Record<string, any>;
}

export interface MCPResult {
  success: boolean;
  data?: any;
  error?: string;
}

// ── GitHub ──
async function executeGitHub(token: string, action: string, params: Record<string, any>): Promise<MCPResult> {
  const headers = { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" };

  switch (action) {
    case "list_repos": {
      const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=20", { headers });
      const data = await res.json();
      return { success: res.ok, data: data.map((r: any) => ({ name: r.full_name, url: r.html_url, stars: r.stargazers_count, updated: r.updated_at })) };
    }
    case "get_repo": {
      const res = await fetch(`https://api.github.com/repos/${params.repo}`, { headers });
      return { success: res.ok, data: await res.json() };
    }
    case "list_issues": {
      const res = await fetch(`https://api.github.com/repos/${params.repo}/issues?state=open&per_page=20`, { headers });
      return { success: res.ok, data: await res.json() };
    }
    case "create_issue": {
      const res = await fetch(`https://api.github.com/repos/${params.repo}/issues`, {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ title: params.title, body: params.body }),
      });
      return { success: res.ok, data: await res.json() };
    }
    default:
      return { success: false, error: `Unknown GitHub action: ${action}` };
  }
}

// ── Slack ──
async function executeSlack(token: string, action: string, params: Record<string, any>): Promise<MCPResult> {
  const post = async (method: string, body: any) => {
    const res = await fetch(`https://slack.com/api/${method}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  switch (action) {
    case "list_channels": {
      const data = await post("conversations.list", { types: "public_channel,private_channel", limit: 50 });
      return { success: data.ok, data: data.channels?.map((c: any) => ({ id: c.id, name: c.name })) };
    }
    case "send_message": {
      const data = await post("chat.postMessage", { channel: params.channel, text: params.text });
      return { success: data.ok, data };
    }
    case "read_messages": {
      const data = await post("conversations.history", { channel: params.channel, limit: params.limit || 10 });
      return { success: data.ok, data: data.messages };
    }
    default:
      return { success: false, error: `Unknown Slack action: ${action}` };
  }
}

// ── Stripe ──
async function executeStripe(token: string, action: string, params: Record<string, any>): Promise<MCPResult> {
  const get = async (path: string) => {
    const res = await fetch(`https://api.stripe.com/v1${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { ok: res.ok, data: await res.json() };
  };

  switch (action) {
    case "get_balance": {
      const { ok, data } = await get("/balance");
      return { success: ok, data };
    }
    case "list_customers": {
      const { ok, data } = await get("/customers?limit=20");
      return { success: ok, data: data.data };
    }
    case "list_payments": {
      const { ok, data } = await get("/payment_intents?limit=20");
      return { success: ok, data: data.data };
    }
    default:
      return { success: false, error: `Unknown Stripe action: ${action}` };
  }
}

// ── Vercel ──
async function executeVercel(token: string, action: string, params: Record<string, any>): Promise<MCPResult> {
  const headers = { Authorization: `Bearer ${token}` };

  switch (action) {
    case "list_projects": {
      const res = await fetch("https://api.vercel.com/v9/projects", { headers });
      const data = await res.json();
      return { success: res.ok, data: data.projects };
    }
    case "list_deployments": {
      const res = await fetch(`https://api.vercel.com/v6/deployments?limit=10${params.projectId ? `&projectId=${params.projectId}` : ""}`, { headers });
      const data = await res.json();
      return { success: res.ok, data: data.deployments };
    }
    default:
      return { success: false, error: `Unknown Vercel action: ${action}` };
  }
}

// ── Dispatcher ──
const EXECUTORS: Record<string, (token: string, action: string, params: Record<string, any>) => Promise<MCPResult>> = {
  github: executeGitHub,
  slack: executeSlack,
  stripe: executeStripe,
  vercel: executeVercel,
};

export class MCPService {
  async execute(userId: string, mcpAction: MCPAction): Promise<MCPResult> {
    const connector = await db.query.connectors.findFirst({
      where: and(
        eq(connectors.userId, userId),
        eq(connectors.type, mcpAction.connector),
        eq(connectors.status, "connected"),
      ),
    });

    if (!connector) {
      return { success: false, error: `Connector ${mcpAction.connector} not connected` };
    }

    const token = decrypt(connector.credentialsEncrypted);
    const executor = EXECUTORS[mcpAction.connector];

    if (!executor) {
      return { success: false, error: `No executor for connector: ${mcpAction.connector}` };
    }

    try {
      return await executor(token, mcpAction.action, mcpAction.params);
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  getAvailableActions(connectorType: string): string[] {
    const actions: Record<string, string[]> = {
      github: ["list_repos", "get_repo", "list_issues", "create_issue"],
      slack: ["list_channels", "send_message", "read_messages"],
      stripe: ["get_balance", "list_customers", "list_payments"],
      vercel: ["list_projects", "list_deployments"],
    };
    return actions[connectorType] || [];
  }
}

export const mcpService = new MCPService();
