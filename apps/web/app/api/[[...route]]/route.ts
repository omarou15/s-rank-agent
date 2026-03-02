import { Hono } from "hono";
import { handle } from "hono/vercel";
import { cors } from "hono/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const app = new Hono().basePath("/api");
app.use("*", cors({ origin: "*", credentials: true }));

// ── VPS Config ──
const VPS_URL = "http://46.225.103.230:3100";
const VPS_KEY = "changeme"; // TODO: rotate to secure key

async function vps(path: string, options?: RequestInit) {
  const res = await fetch(`${VPS_URL}${path}`, {
    ...options,
    headers: { "x-api-key": VPS_KEY, "Content-Type": "application/json", ...(options?.headers || {}) },
    cache: "no-store",
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

// ── Chat Stream → see /api/chat/stream/route.ts (Edge runtime) ──

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

// Generic file upload (used by chat input)
app.post("/files", async (c) => {
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

// ── File Download (read file content for chat download) ──
app.get("/files/download", async (c) => {
  const path = c.req.query("path") || "";
  if (!path) return c.json({ error: "Path required" }, 400);

  const ext = path.split(".").pop()?.toLowerCase() || "";
  const binaryExts = ["png", "jpg", "jpeg", "gif", "webp", "ico", "pdf", "zip", "tar", "gz", "rar", "7z", "mp3", "mp4", "wav", "ogg", "doc", "docx", "xls", "xlsx", "pptx", "sqlite", "db", "woff", "woff2", "ttf", "eot"];
  const mimeMap: Record<string, string> = {
    pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
    svg: "image/svg+xml", webp: "image/webp", zip: "application/zip", gz: "application/gzip",
    csv: "text/csv", json: "application/json", html: "text/html", xml: "text/xml",
    mp3: "audio/mpeg", mp4: "video/mp4", wav: "audio/wav",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };

  try {
    if (binaryExts.includes(ext)) {
      // Binary: use exec to base64 encode the file
      const result = await vps("/exec", {
        method: "POST",
        body: JSON.stringify({ code: `base64 -w 0 "${path}"`, language: "bash" }),
      });
      if (result.exitCode === 0 && result.stdout) {
        return c.json({ base64: result.stdout.trim(), mime: mimeMap[ext] || "application/octet-stream" });
      }
      return c.json({ error: "Cannot read binary file" }, 500);
    } else {
      // Text: use files/read
      const result = await vps(`/files/read?path=${encodeURIComponent(path)}`);
      return c.json({ content: result.content || "", mime: mimeMap[ext] || "text/plain" });
    }
  } catch (e: any) {
    return c.json({ error: e.message || "Download failed" }, 500);
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

// ── Crons ──
app.get("/crons", async (c) => {
  try { return c.json(await vps("/crons")); }
  catch { return c.json([]); }
});
app.post("/crons", async (c) => {
  const body = await c.req.json();
  try { return c.json(await vps("/crons", { method: "POST", body: JSON.stringify(body) })); }
  catch (e: any) { return c.json({ error: e.message }, 500); }
});
app.put("/crons/:id", async (c) => {
  const body = await c.req.json();
  try { return c.json(await vps(`/crons/${c.req.param("id")}`, { method: "PUT", body: JSON.stringify(body) })); }
  catch (e: any) { return c.json({ error: e.message }, 500); }
});
app.delete("/crons/:id", async (c) => {
  try { return c.json(await vps(`/crons/${c.req.param("id")}`, { method: "DELETE" })); }
  catch (e: any) { return c.json({ error: e.message }, 500); }
});
app.post("/crons/:id/run", async (c) => {
  try { return c.json(await vps(`/crons/${c.req.param("id")}/run`, { method: "POST" })); }
  catch (e: any) { return c.json({ error: e.message }, 500); }
});
app.get("/crons/log", async (c) => {
  try { return c.json(await vps("/crons/log")); }
  catch { return c.json([]); }
});

// ── Wallet ──
app.get("/wallet", async (c) => {
  try { return c.json(await vps("/wallet")); }
  catch { return c.json({ balance: 0, daily_limit: 10, monthly_limit: 100, daily_spent: 0, monthly_spent: 0, transactions: [] }); }
});
app.post("/wallet/topup", async (c) => {
  const body = await c.req.json();
  try { return c.json(await vps("/wallet/topup", { method: "POST", body: JSON.stringify(body) })); }
  catch (e: any) { return c.json({ error: e.message }, 500); }
});
app.post("/wallet/spend", async (c) => {
  const body = await c.req.json();
  try { return c.json(await vps("/wallet/spend", { method: "POST", body: JSON.stringify(body) })); }
  catch (e: any) { return c.json({ error: e.message }, 500); }
});
app.post("/wallet/limits", async (c) => {
  const body = await c.req.json();
  try { return c.json(await vps("/wallet/limits", { method: "POST", body: JSON.stringify(body) })); }
  catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ── Email ──
app.get("/email/config", async (c) => {
  try { return c.json(await vps("/email/config")); }
  catch { return c.json({ configured: false }); }
});
app.post("/email/config", async (c) => {
  const body = await c.req.json();
  try { return c.json(await vps("/email/config", { method: "POST", body: JSON.stringify(body) })); }
  catch (e: any) { return c.json({ error: e.message }, 500); }
});
app.post("/email/test", async (c) => {
  try { return c.json(await vps("/email/test", { method: "POST" })); }
  catch (e: any) { return c.json({ status: "error", error: e.message }); }
});
app.post("/email/send", async (c) => {
  const body = await c.req.json();
  try { return c.json(await vps("/email/send", { method: "POST", body: JSON.stringify(body) })); }
  catch (e: any) { return c.json({ error: e.message }, 500); }
});
app.get("/email/log", async (c) => {
  try { return c.json(await vps("/email/log")); }
  catch { return c.json([]); }
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

// ── Memory ──
app.get("/memory", async (c) => {
  try { return c.json(await vps("/memory")); }
  catch { return c.json({ preferences: {}, facts: [], style: "", context: "" }); }
});
app.get("/memory/prompt", async (c) => {
  try { return c.json(await vps("/memory/prompt")); }
  catch { return c.json({ context: "" }); }
});
app.post("/memory/fact", async (c) => {
  const body = await c.req.json();
  try { return c.json(await vps("/memory/fact", { method: "POST", body: JSON.stringify(body) })); }
  catch { return c.json({ error: "failed" }, 500); }
});
app.post("/memory/pref", async (c) => {
  const body = await c.req.json();
  try { return c.json(await vps("/memory/pref", { method: "POST", body: JSON.stringify(body) })); }
  catch { return c.json({ error: "failed" }, 500); }
});
app.post("/memory/style", async (c) => {
  const body = await c.req.json();
  try { return c.json(await vps("/memory/style", { method: "POST", body: JSON.stringify(body) })); }
  catch { return c.json({ error: "failed" }, 500); }
});
app.post("/memory/context", async (c) => {
  const body = await c.req.json();
  try { return c.json(await vps("/memory/context", { method: "POST", body: JSON.stringify(body) })); }
  catch { return c.json({ error: "failed" }, 500); }
});
app.delete("/memory", async (c) => {
  try { return c.json(await vps("/memory", { method: "DELETE" })); }
  catch { return c.json({ error: "failed" }, 500); }
});

// ── Conversations (proxy to VPS) ──
app.get("/conversations", async (c) => {
  try { return c.json(await vps("/conversations")); }
  catch { return c.json({ conversations: [] }); }
});
app.get("/conversations/:id", async (c) => {
  try { return c.json(await vps(`/conversations/${c.req.param("id")}`)); }
  catch { return c.json({ error: "Not found" }, 404); }
});
app.post("/conversations", async (c) => {
  const body = await c.req.json();
  try { return c.json(await vps("/conversations", { method: "POST", body: JSON.stringify(body) })); }
  catch (e: any) { return c.json({ error: e.message }, 500); }
});
app.put("/conversations/:id", async (c) => {
  const body = await c.req.json();
  try { return c.json(await vps(`/conversations/${c.req.param("id")}`, { method: "PUT", body: JSON.stringify(body) })); }
  catch (e: any) { return c.json({ error: e.message }, 500); }
});
app.delete("/conversations/:id", async (c) => {
  try { return c.json(await vps(`/conversations/${c.req.param("id")}`, { method: "DELETE" })); }
  catch { return c.json({ success: false }); }
});

// ── Folders ──
app.get("/folders", async (c) => {
  try { return c.json(await vps("/folders")); }
  catch { return c.json({ folders: [{ id: "default", name: "Général" }] }); }
});
app.post("/folders", async (c) => {
  const body = await c.req.json();
  try { return c.json(await vps("/folders", { method: "POST", body: JSON.stringify(body) })); }
  catch (e: any) { return c.json({ error: e.message }, 500); }
});
app.delete("/folders/:id", async (c) => {
  try { return c.json(await vps(`/folders/${c.req.param("id")}`, { method: "DELETE" })); }
  catch { return c.json({ success: false }); }
});

// ── Preview: serve static files from user apps ──
app.get("/preview/:appName/*", async (c) => {
  const appName = c.req.param("appName");
  let splat = c.req.path.replace(`/api/preview/${appName}/`, "").replace(/^\/+/, "");
  if (!splat || splat === "" || splat === "/") splat = "index.html";
  const filePath = `/home/agent/apps/${appName}/${splat}`;
  try {
    const data = await vps(`/files/read?path=${encodeURIComponent(filePath)}`);
    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    const mimeMap: Record<string, string> = {
      html: "text/html", css: "text/css", js: "application/javascript",
      json: "application/json", svg: "image/svg+xml", png: "image/png",
      jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
      ico: "image/x-icon", woff: "font/woff", woff2: "font/woff2", txt: "text/plain",
    };
    const mime = mimeMap[ext] || "text/plain";
    return new Response(data.content || "", { headers: { "Content-Type": `${mime}; charset=utf-8`, "Access-Control-Allow-Origin": "*" } });
  } catch { return c.text("File not found", 404); }
});

app.get("/preview/:appName", async (c) => {
  const appName = c.req.param("appName");
  return c.redirect(`/api/preview/${appName}/`);
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
