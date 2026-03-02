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

// ── MCP CONNECTORS — Real API proxy routes ──

// Helper: get connector token from request header
function getToken(c: any): string { return c.req.header("x-connector-token") || ""; }

// ── GITHUB ──
app.post("/mcp/github/verify", async (c) => {
  const token = getToken(c);
  if (!token) return c.json({ ok: false, error: "No token" }, 400);
  try {
    const r = await fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${token}`, "User-Agent": "S-Rank-Agent" } });
    if (!r.ok) return c.json({ ok: false, error: "Invalid token" });
    const user = await r.json();
    return c.json({ ok: true, user: { login: user.login, name: user.name, avatar: user.avatar_url } });
  } catch (e: any) { return c.json({ ok: false, error: e.message }); }
});

app.get("/mcp/github/repos", async (c) => {
  const token = getToken(c);
  const r = await fetch("https://api.github.com/user/repos?sort=updated&per_page=30", { headers: { Authorization: `Bearer ${token}`, "User-Agent": "S-Rank-Agent" } });
  const repos = await r.json();
  return c.json({ repos: Array.isArray(repos) ? repos.map((r: any) => ({ name: r.full_name, url: r.html_url, description: r.description, language: r.language, stars: r.stargazers_count, updated: r.updated_at })) : [] });
});

app.get("/mcp/github/issues", async (c) => {
  const token = getToken(c);
  const repo = c.req.query("repo") || "";
  const r = await fetch(`https://api.github.com/repos/${repo}/issues?state=open&per_page=20`, { headers: { Authorization: `Bearer ${token}`, "User-Agent": "S-Rank-Agent" } });
  const issues = await r.json();
  return c.json({ issues: Array.isArray(issues) ? issues.map((i: any) => ({ number: i.number, title: i.title, state: i.state, user: i.user?.login, created: i.created_at, url: i.html_url })) : [] });
});

app.post("/mcp/github/create-issue", async (c) => {
  const token = getToken(c);
  const { repo, title, body, labels } = await c.req.json();
  const r = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "User-Agent": "S-Rank-Agent", "Content-Type": "application/json" },
    body: JSON.stringify({ title, body, labels: labels || [] })
  });
  const issue = await r.json();
  return c.json({ ok: r.ok, issue: { number: issue.number, url: issue.html_url } });
});

app.get("/mcp/github/file", async (c) => {
  const token = getToken(c);
  const repo = c.req.query("repo") || "";
  const path = c.req.query("path") || "";
  const r = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, { headers: { Authorization: `Bearer ${token}`, "User-Agent": "S-Rank-Agent" } });
  const data = await r.json();
  if (data.content) {
    const content = Buffer.from(data.content, "base64").toString("utf-8");
    return c.json({ ok: true, path: data.path, content, size: data.size });
  }
  if (Array.isArray(data)) return c.json({ ok: true, type: "dir", files: data.map((f: any) => ({ name: f.name, type: f.type, path: f.path, size: f.size })) });
  return c.json({ ok: false, error: "Not found" });
});

app.post("/mcp/github/commit", async (c) => {
  const token = getToken(c);
  const { repo, path, content, message, branch } = await c.req.json();
  // Get current file SHA if exists
  let sha: string | undefined;
  try {
    const existing = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch || "main"}`, { headers: { Authorization: `Bearer ${token}`, "User-Agent": "S-Rank-Agent" } });
    if (existing.ok) { const d = await existing.json(); sha = d.sha; }
  } catch {}
  const r = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: "PUT", headers: { Authorization: `Bearer ${token}`, "User-Agent": "S-Rank-Agent", "Content-Type": "application/json" },
    body: JSON.stringify({ message: message || `Update ${path}`, content: Buffer.from(content).toString("base64"), branch: branch || "main", ...(sha ? { sha } : {}) })
  });
  return c.json({ ok: r.ok, ...(await r.json()) });
});

// ── SLACK ──
app.post("/mcp/slack/verify", async (c) => {
  const token = getToken(c);
  try {
    const r = await fetch("https://slack.com/api/auth.test", { headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json();
    return c.json({ ok: data.ok, team: data.team, user: data.user });
  } catch (e: any) { return c.json({ ok: false, error: e.message }); }
});

app.get("/mcp/slack/channels", async (c) => {
  const token = getToken(c);
  const r = await fetch("https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=50", { headers: { Authorization: `Bearer ${token}` } });
  const data = await r.json();
  return c.json({ ok: data.ok, channels: (data.channels || []).map((ch: any) => ({ id: ch.id, name: ch.name, topic: ch.topic?.value, members: ch.num_members })) });
});

app.post("/mcp/slack/send", async (c) => {
  const token = getToken(c);
  const { channel, text, blocks } = await c.req.json();
  const r = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel, text, blocks })
  });
  const data = await r.json();
  return c.json({ ok: data.ok, ts: data.ts, channel: data.channel });
});

app.get("/mcp/slack/messages", async (c) => {
  const token = getToken(c);
  const channel = c.req.query("channel") || "";
  const r = await fetch(`https://slack.com/api/conversations.history?channel=${channel}&limit=20`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await r.json();
  return c.json({ ok: data.ok, messages: (data.messages || []).map((m: any) => ({ user: m.user, text: m.text, ts: m.ts, type: m.type })) });
});

// ── GOOGLE DRIVE ──
app.post("/mcp/gdrive/verify", async (c) => {
  const token = getToken(c);
  try {
    const r = await fetch("https://www.googleapis.com/drive/v3/about?fields=user", { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return c.json({ ok: false, error: "Invalid token" });
    const data = await r.json();
    return c.json({ ok: true, user: data.user });
  } catch (e: any) { return c.json({ ok: false, error: e.message }); }
});

app.get("/mcp/gdrive/files", async (c) => {
  const token = getToken(c);
  const q = c.req.query("q") || "";
  const query = q ? `&q=name contains '${q}'` : "";
  const r = await fetch(`https://www.googleapis.com/drive/v3/files?pageSize=30&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)${query}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await r.json();
  return c.json({ ok: true, files: data.files || [] });
});

app.get("/mcp/gdrive/download", async (c) => {
  const token = getToken(c);
  const fileId = c.req.query("fileId") || "";
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
  const content = await r.text();
  return c.json({ ok: true, content });
});

// ── STRIPE ──
app.post("/mcp/stripe/verify", async (c) => {
  const token = getToken(c);
  try {
    const r = await fetch("https://api.stripe.com/v1/balance", { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return c.json({ ok: false, error: "Invalid key" });
    const data = await r.json();
    return c.json({ ok: true, balance: data.available?.map((b: any) => ({ amount: b.amount / 100, currency: b.currency })) });
  } catch (e: any) { return c.json({ ok: false, error: e.message }); }
});

app.get("/mcp/stripe/customers", async (c) => {
  const token = getToken(c);
  const r = await fetch("https://api.stripe.com/v1/customers?limit=20", { headers: { Authorization: `Bearer ${token}` } });
  const data = await r.json();
  return c.json({ ok: true, customers: (data.data || []).map((cu: any) => ({ id: cu.id, email: cu.email, name: cu.name, created: cu.created })) });
});

app.get("/mcp/stripe/payments", async (c) => {
  const token = getToken(c);
  const r = await fetch("https://api.stripe.com/v1/payment_intents?limit=20", { headers: { Authorization: `Bearer ${token}` } });
  const data = await r.json();
  return c.json({ ok: true, payments: (data.data || []).map((p: any) => ({ id: p.id, amount: p.amount / 100, currency: p.currency, status: p.status, created: p.created })) });
});

app.get("/mcp/stripe/products", async (c) => {
  const token = getToken(c);
  const r = await fetch("https://api.stripe.com/v1/products?limit=20", { headers: { Authorization: `Bearer ${token}` } });
  const data = await r.json();
  return c.json({ ok: true, products: (data.data || []).map((p: any) => ({ id: p.id, name: p.name, active: p.active, description: p.description })) });
});

app.post("/mcp/stripe/create-product", async (c) => {
  const token = getToken(c);
  const { name, description, price, currency } = await c.req.json();
  // Create product
  const pr = await fetch("https://api.stripe.com/v1/products", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ name, description: description || "" })
  });
  const product = await pr.json();
  if (!pr.ok) return c.json({ ok: false, error: product.error?.message });
  // Create price
  const pp = await fetch("https://api.stripe.com/v1/prices", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ product: product.id, unit_amount: String(Math.round(price * 100)), currency: currency || "eur" })
  });
  const priceObj = await pp.json();
  return c.json({ ok: true, product: { id: product.id, name: product.name }, price: { id: priceObj.id, amount: price } });
});

// ── VERCEL ──
app.post("/mcp/vercel/verify", async (c) => {
  const token = getToken(c);
  try {
    const r = await fetch("https://api.vercel.com/v2/user", { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return c.json({ ok: false, error: "Invalid token" });
    const data = await r.json();
    return c.json({ ok: true, user: { name: data.user?.name, email: data.user?.email, username: data.user?.username } });
  } catch (e: any) { return c.json({ ok: false, error: e.message }); }
});

app.get("/mcp/vercel/projects", async (c) => {
  const token = getToken(c);
  const r = await fetch("https://api.vercel.com/v9/projects", { headers: { Authorization: `Bearer ${token}` } });
  const data = await r.json();
  return c.json({ ok: true, projects: (data.projects || []).map((p: any) => ({ id: p.id, name: p.name, framework: p.framework, url: p.latestDeployments?.[0]?.url })) });
});

app.get("/mcp/vercel/deployments", async (c) => {
  const token = getToken(c);
  const project = c.req.query("project") || "";
  const q = project ? `?projectId=${project}&limit=10` : "?limit=10";
  const r = await fetch(`https://api.vercel.com/v6/deployments${q}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await r.json();
  return c.json({ ok: true, deployments: (data.deployments || []).map((d: any) => ({ id: d.uid, url: d.url, state: d.state, created: d.created, source: d.source })) });
});

// ── CLERK ──
app.post("/mcp/clerk/verify", async (c) => {
  const token = getToken(c);
  try {
    const r = await fetch("https://api.clerk.com/v1/users?limit=1", { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return c.json({ ok: false, error: "Invalid key" });
    return c.json({ ok: true });
  } catch (e: any) { return c.json({ ok: false, error: e.message }); }
});

app.get("/mcp/clerk/users", async (c) => {
  const token = getToken(c);
  const r = await fetch("https://api.clerk.com/v1/users?limit=30&order_by=-created_at", { headers: { Authorization: `Bearer ${token}` } });
  const users = await r.json();
  return c.json({ ok: true, users: Array.isArray(users) ? users.map((u: any) => ({ id: u.id, email: u.email_addresses?.[0]?.email_address, firstName: u.first_name, lastName: u.last_name, createdAt: u.created_at, lastSignIn: u.last_sign_in_at, banned: u.banned })) : [] });
});

app.post("/mcp/clerk/ban", async (c) => {
  const token = getToken(c);
  const { userId } = await c.req.json();
  const r = await fetch(`https://api.clerk.com/v1/users/${userId}/ban`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  return c.json({ ok: r.ok });
});

app.post("/mcp/clerk/unban", async (c) => {
  const token = getToken(c);
  const { userId } = await c.req.json();
  const r = await fetch(`https://api.clerk.com/v1/users/${userId}/unban`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  return c.json({ ok: r.ok });
});

app.get("/mcp/clerk/sessions", async (c) => {
  const token = getToken(c);
  const r = await fetch("https://api.clerk.com/v1/sessions?limit=30&status=active", { headers: { Authorization: `Bearer ${token}` } });
  const data = await r.json();
  return c.json({ ok: true, sessions: Array.isArray(data) ? data.map((s: any) => ({ id: s.id, userId: s.user_id, status: s.status, lastActiveAt: s.last_active_at, expireAt: s.expire_at })) : [] });
});

// ── POSTGRESQL (direct query via VPS) ──
app.post("/mcp/postgres/verify", async (c) => {
  const token = getToken(c); // connection string
  if (!token.startsWith("postgresql://")) return c.json({ ok: false, error: "Invalid connection string" });
  try {
    const r = await vps("/exec", { method: "POST", body: JSON.stringify({ command: `psql "${token}" -c "SELECT version();" 2>&1 | head -3` }) });
    return c.json({ ok: true, result: r });
  } catch (e: any) { return c.json({ ok: false, error: e.message }); }
});

app.post("/mcp/postgres/query", async (c) => {
  const { connectionString, query: sql } = await c.req.json();
  if (!connectionString || !sql) return c.json({ ok: false, error: "Missing params" });
  try {
    // Execute SQL via VPS psql
    const escaped = sql.replace(/"/g, '\\"');
    const r = await vps("/exec", { method: "POST", body: JSON.stringify({ command: `psql "${connectionString}" -c "${escaped}" --csv 2>&1` }) });
    return c.json({ ok: true, result: r });
  } catch (e: any) { return c.json({ ok: false, error: e.message }); }
});
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
