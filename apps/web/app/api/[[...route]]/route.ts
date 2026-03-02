import { Hono } from "hono";
import { handle } from "hono/vercel";
import { cors } from "hono/cors";

export const runtime = "edge";

const app = new Hono().basePath("/api");
app.use("*", cors({ origin: "*", credentials: true }));

// ── VPS Config ──
const VPS_URL = "http://46.225.103.230:3100";
const VPS_KEY = "changeme"; // TODO: rotate to secure key

async function vps(path: string, options?: RequestInit) {
  const res = await fetch(`${VPS_URL}${path}`, {
    ...options,
    headers: { "x-api-key": VPS_KEY, "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  return res.json();
}

// ── Health ──
app.get("/health", async (c) => {
  try {
    const data = await vps("/health");
    return c.json({ status: "ok", vps: data });
  } catch {
    return c.json({ status: "ok", vps: null });
  }
});

// ── Chat Stream (BYOK) ──
app.post("/chat/stream", async (c) => {
  const body = await c.req.json();
  const { content, apiKey, model, history } = body;
  if (!apiKey) return c.json({ error: "API key required. Add your Claude API key in Settings." }, 400);
  if (!content) return c.json({ error: "Message content required" }, 400);

  const messages = [...(history || []), { role: "user", content }];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-sonnet-4-20250514",
      max_tokens: 8192,
      stream: true,
      system: `Tu es S-Rank Agent, un agent IA autonome avec un PC cloud (Ubuntu ARM, 2 vCPU, 4GB RAM).
Tu peux exécuter du code (Python, Node.js, Bash), gérer des fichiers, et déployer des apps.
Sois concis et orienté action. Utilise des blocs de code markdown.`,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return c.json({ error: `Claude API error: ${error}` }, 400);
  }

  return new Response(response.body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
});

// ── Files (proxy to VPS) ──
app.get("/files/list", async (c) => {
  const path = c.req.query("path") || "/home/agent";
  try {
    return c.json(await vps(`/files/list?path=${encodeURIComponent(path)}`));
  } catch (e: any) {
    return c.json({ path, files: [], error: e.message }, 500);
  }
});

app.get("/files/read", async (c) => {
  const path = c.req.query("path") || "";
  try {
    return c.json(await vps(`/files/read?path=${encodeURIComponent(path)}`));
  } catch (e: any) {
    return c.json({ path, content: "", error: e.message }, 500);
  }
});

app.post("/files/write", async (c) => {
  const body = await c.req.json();
  try {
    return c.json(await vps("/files/write", { method: "POST", body: JSON.stringify(body) }));
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post("/files/mkdir", async (c) => {
  const body = await c.req.json();
  try {
    return c.json(await vps("/files/mkdir", { method: "POST", body: JSON.stringify(body) }));
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.delete("/files/delete", (c) => {
  const path = c.req.query("path") || "";
  return fetch(`${VPS_URL}/files/delete?path=${encodeURIComponent(path)}`, {
    method: "DELETE",
    headers: { "x-api-key": VPS_KEY },
  }).then(r => r.json()).then(d => c.json(d)).catch(e => c.json({ error: e.message }, 500));
});

app.get("/files/search", async (c) => {
  const q = c.req.query("q") || "";
  try {
    return c.json(await vps(`/files/search?q=${encodeURIComponent(q)}`));
  } catch (e: any) {
    return c.json({ results: [] }, 500);
  }
});

// ── Code Execution (proxy to VPS) ──
app.post("/exec", async (c) => {
  const body = await c.req.json();
  try {
    return c.json(await vps("/exec", { method: "POST", body: JSON.stringify(body) }));
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ── Server Metrics ──
app.get("/server/metrics", async (c) => {
  try {
    return c.json(await vps("/metrics"));
  } catch {
    return c.json({ cpu: 0, memUsed: 0, memTotal: 0, uptime: 0 });
  }
});

app.get("/server/status", async (c) => {
  try {
    const health = await vps("/health");
    return c.json({ status: "running", server: { ip: "46.225.103.230", type: "cax11", location: "nbg1" }, ...health });
  } catch {
    return c.json({ status: "offline", server: null });
  }
});

// ── Stubs for other pages ──
app.get("/settings/profile", (c) => c.json({ user: { plan: "starter", trustLevel: 2 }, server: { ip: "46.225.103.230", status: "running" } }));
app.get("/monitoring/dashboard", async (c) => {
  try { const m = await vps("/metrics"); return c.json({ server: m, connectors: { total: 0, active: 0 }, skills: { installed: 0 } }); }
  catch { return c.json({ server: null, connectors: { total: 0, active: 0 }, skills: { installed: 0 } }); }
});
app.get("/monitoring/usage", (c) => c.json({ period: "month", usage: { totalInput: 0, totalOutput: 0, totalCost: 0, messageCount: 0 } }));
app.get("/monitoring/logs", (c) => c.json({ logs: [] }));
app.get("/connectors", (c) => c.json({ connectors: [] }));
app.get("/skills/marketplace", (c) => c.json({ skills: [
  { id: "1", name: "Web Scraper", slug: "web-scraper", description: "Extraire des données de sites web", category: "data", author: "S-Rank Official", isOfficial: true, installs: 2340, rating: 48 },
  { id: "2", name: "Data Analyst", slug: "data-analyst", description: "Analyser CSV, Excel, bases de données", category: "data", author: "S-Rank Official", isOfficial: true, installs: 1890, rating: 47 },
  { id: "3", name: "DevOps Auto", slug: "devops-auto", description: "CI/CD, Docker, déploiements", category: "devops", author: "S-Rank Official", isOfficial: true, installs: 1560, rating: 46 },
  { id: "4", name: "Content Writer", slug: "content-writer", description: "Articles, emails, posts sociaux", category: "content", author: "S-Rank Official", isOfficial: true, installs: 3200, rating: 49 },
  { id: "5", name: "API Builder", slug: "api-builder", description: "APIs REST et GraphQL", category: "development", author: "S-Rank Official", isOfficial: true, installs: 1420, rating: 46 },
] }));
app.get("/skills/installed", (c) => c.json({ skills: [] }));
app.get("/chat/conversations", (c) => c.json({ conversations: [] }));

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
