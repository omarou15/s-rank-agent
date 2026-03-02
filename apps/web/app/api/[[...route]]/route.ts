import { Hono } from "hono";
import { handle } from "hono/vercel";
import { cors } from "hono/cors";

export const runtime = "edge";

const app = new Hono().basePath("/api");

app.use("*", cors({ origin: "*", credentials: true }));

// Health
app.get("/health", (c) => {
  return c.json({ status: "ok", service: "s-rank-agent-api", version: "0.1.0" });
});

// ── Chat Stream (BYOK - user sends their own API key) ──
app.post("/chat/stream", async (c) => {
  const body = await c.req.json();
  const { content, apiKey, model, history } = body;

  if (!apiKey) return c.json({ error: "API key required. Add your Claude API key in Settings." }, 400);
  if (!content) return c.json({ error: "Message content required" }, 400);

  const messages = [
    ...(history || []),
    { role: "user", content },
  ];

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
      system: `Tu es S-Rank Agent, un agent IA autonome qui tourne sur le PC cloud de l'utilisateur.

## Tes capacités
- Exécuter du code (Python, JavaScript, Bash)
- Gérer des fichiers (créer, lire, éditer, supprimer)
- Interagir avec des services connectés (GitHub, Slack, Stripe, Vercel)
- Déployer des applications
- Analyser des données

## Style
- Sois concis et orienté action
- Quand tu montres du code, utilise des blocs markdown avec le langage
- Si une action échoue, explique pourquoi et propose des alternatives`,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return c.json({ error: `Claude API error: ${error}` }, 400);
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});

// ── Settings ──
app.get("/settings/profile", (c) => {
  return c.json({
    user: { plan: "starter", trustLevel: 2, apiKeyValid: false, agentMode: "on-demand" },
    server: null,
  });
});

// ── Monitoring ──
app.get("/monitoring/dashboard", (c) => {
  return c.json({
    server: null,
    connectors: { total: 0, active: 0, errors: 0 },
    skills: { installed: 0, active: 0 },
  });
});

app.get("/monitoring/usage", (c) => {
  return c.json({ period: "month", usage: { totalInput: 0, totalOutput: 0, totalCost: 0, messageCount: 0 } });
});

app.get("/monitoring/logs", (c) => {
  return c.json({ logs: [] });
});

// ── Connectors ──
app.get("/connectors", (c) => {
  return c.json({ connectors: [] });
});

// ── Skills ──
app.get("/skills/marketplace", (c) => {
  return c.json({
    skills: [
      { id: "1", name: "Web Scraper", slug: "web-scraper", description: "Extraire des données de sites web", category: "data", author: "S-Rank Official", isOfficial: true, installs: 2340, rating: 48 },
      { id: "2", name: "Data Analyst", slug: "data-analyst", description: "Analyser CSV, Excel, bases de données", category: "data", author: "S-Rank Official", isOfficial: true, installs: 1890, rating: 47 },
      { id: "3", name: "DevOps Auto", slug: "devops-auto", description: "Automatiser CI/CD, Docker, déploiements", category: "devops", author: "S-Rank Official", isOfficial: true, installs: 1560, rating: 46 },
      { id: "4", name: "Content Writer", slug: "content-writer", description: "Rédiger articles, emails, posts sociaux", category: "content", author: "S-Rank Official", isOfficial: true, installs: 3200, rating: 49 },
      { id: "5", name: "API Builder", slug: "api-builder", description: "Créer des APIs REST et GraphQL", category: "development", author: "S-Rank Official", isOfficial: true, installs: 1420, rating: 46 },
    ],
  });
});

app.get("/skills/installed", (c) => {
  return c.json({ skills: [] });
});

// ── Conversations ──
app.get("/chat/conversations", (c) => {
  return c.json({ conversations: [] });
});

// ═══════════════════════════════════════════════════
// ══ FILE EXPLORER (SSH to VPS or demo mode) ══════
// ═══════════════════════════════════════════════════

// Demo filesystem (used before VPS is provisioned)
const DEMO_FS: Record<string, any[]> = {
  "/home/agent": [
    { name: "projects", path: "/home/agent/projects", type: "directory", size: 0, modified: "2026-03-02T01:00:00Z", extension: null },
    { name: "downloads", path: "/home/agent/downloads", type: "directory", size: 0, modified: "2026-03-02T01:00:00Z", extension: null },
    { name: "scripts", path: "/home/agent/scripts", type: "directory", size: 0, modified: "2026-03-02T01:00:00Z", extension: null },
    { name: ".bashrc", path: "/home/agent/.bashrc", type: "file", size: 3771, modified: "2026-03-02T01:00:00Z", extension: "sh" },
    { name: "README.md", path: "/home/agent/README.md", type: "file", size: 256, modified: "2026-03-02T01:00:00Z", extension: "md" },
  ],
  "/home/agent/projects": [
    { name: "my-website", path: "/home/agent/projects/my-website", type: "directory", size: 0, modified: "2026-03-02T01:00:00Z", extension: null },
    { name: "data-analysis", path: "/home/agent/projects/data-analysis", type: "directory", size: 0, modified: "2026-03-01T18:00:00Z", extension: null },
  ],
  "/home/agent/projects/my-website": [
    { name: "index.html", path: "/home/agent/projects/my-website/index.html", type: "file", size: 2450, modified: "2026-03-02T00:30:00Z", extension: "html" },
    { name: "style.css", path: "/home/agent/projects/my-website/style.css", type: "file", size: 1230, modified: "2026-03-02T00:30:00Z", extension: "css" },
    { name: "app.js", path: "/home/agent/projects/my-website/app.js", type: "file", size: 890, modified: "2026-03-02T00:30:00Z", extension: "js" },
    { name: "logo.png", path: "/home/agent/projects/my-website/logo.png", type: "file", size: 45000, modified: "2026-03-01T20:00:00Z", extension: "png" },
  ],
  "/home/agent/projects/data-analysis": [
    { name: "analysis.py", path: "/home/agent/projects/data-analysis/analysis.py", type: "file", size: 3400, modified: "2026-03-01T18:00:00Z", extension: "py" },
    { name: "data.csv", path: "/home/agent/projects/data-analysis/data.csv", type: "file", size: 128000, modified: "2026-03-01T17:00:00Z", extension: "csv" },
    { name: "report.md", path: "/home/agent/projects/data-analysis/report.md", type: "file", size: 5600, modified: "2026-03-01T18:30:00Z", extension: "md" },
  ],
  "/home/agent/downloads": [
    { name: "document.pdf", path: "/home/agent/downloads/document.pdf", type: "file", size: 2400000, modified: "2026-03-01T15:00:00Z", extension: "pdf" },
    { name: "photo.jpg", path: "/home/agent/downloads/photo.jpg", type: "file", size: 3200000, modified: "2026-03-01T14:00:00Z", extension: "jpg" },
  ],
  "/home/agent/scripts": [
    { name: "backup.sh", path: "/home/agent/scripts/backup.sh", type: "file", size: 450, modified: "2026-03-01T12:00:00Z", extension: "sh" },
    { name: "deploy.sh", path: "/home/agent/scripts/deploy.sh", type: "file", size: 320, modified: "2026-03-01T12:00:00Z", extension: "sh" },
    { name: "scraper.py", path: "/home/agent/scripts/scraper.py", type: "file", size: 1800, modified: "2026-03-01T16:00:00Z", extension: "py" },
  ],
};

const DEMO_FILES: Record<string, string> = {
  "/home/agent/README.md": "# S-Rank Agent\n\nBienvenue sur ton PC cloud piloté par l'IA.\n\n## Dossiers\n- `projects/` — Tes projets\n- `downloads/` — Fichiers téléchargés\n- `scripts/` — Scripts utilitaires\n\nDemande à l'agent de créer, modifier ou organiser tes fichiers.",
  "/home/agent/.bashrc": '# ~/.bashrc\nexport PS1="\\[\\e[1;35m\\]srank\\[\\e[0m\\]@\\[\\e[1;36m\\]agent\\[\\e[0m\\]:\\w$ "\nexport PATH="$HOME/.local/bin:$PATH"\nalias ll="ls -la"\nalias gs="git status"',
  "/home/agent/projects/my-website/index.html": '<!DOCTYPE html>\n<html lang="fr">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Mon Site</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Bienvenue</h1>\n  <p>Site créé par S-Rank Agent</p>\n  <script src="app.js"></script>\n</body>\n</html>',
  "/home/agent/projects/my-website/style.css": "body {\n  font-family: system-ui, sans-serif;\n  background: #0a0a0a;\n  color: #e5e5e5;\n  max-width: 800px;\n  margin: 0 auto;\n  padding: 2rem;\n}\n\nh1 {\n  color: #a78bfa;\n}",
  "/home/agent/projects/my-website/app.js": 'console.log("S-Rank Agent — Site ready");\n\ndocument.addEventListener("DOMContentLoaded", () => {\n  console.log("DOM loaded");\n});',
  "/home/agent/projects/data-analysis/analysis.py": 'import pandas as pd\nimport matplotlib.pyplot as plt\n\n# Charger les données\ndf = pd.read_csv("data.csv")\n\n# Analyse rapide\nprint(f"Lignes: {len(df)}")\nprint(f"Colonnes: {list(df.columns)}")\nprint(df.describe())\n\n# Graphique\ndf.plot(kind="bar")\nplt.savefig("chart.png")\nprint("Analyse terminée")',
  "/home/agent/projects/data-analysis/report.md": "# Rapport d'Analyse\n\n## Résumé\nAnalyse de données effectuée le 1er Mars 2026.\n\n## Résultats\n- 1500 lignes traitées\n- 12 colonnes analysées\n- 3 anomalies détectées\n\n## Conclusion\nLes données sont cohérentes avec les prévisions.",
  "/home/agent/scripts/backup.sh": '#!/bin/bash\n# Backup script\nDATE=$(date +%Y%m%d)\ntar czf "/home/agent/backups/backup-$DATE.tar.gz" /home/agent/projects/\necho "Backup done: backup-$DATE.tar.gz"',
  "/home/agent/scripts/deploy.sh": '#!/bin/bash\n# Deploy to Vercel\ncd /home/agent/projects/my-website\nvercel deploy --prod --yes\necho "Deployed!"',
  "/home/agent/scripts/scraper.py": 'import requests\nfrom bs4 import BeautifulSoup\n\nurl = "https://example.com"\nresponse = requests.get(url)\nsoup = BeautifulSoup(response.text, "html.parser")\n\ntitles = soup.find_all("h2")\nfor t in titles:\n    print(t.text)\n\nprint(f"Found {len(titles)} titles")',
};

app.get("/files/list", (c) => {
  const path = c.req.query("path") || "/home/agent";
  const files = DEMO_FS[path] || [];
  return c.json({ path, files });
});

app.get("/files/read", (c) => {
  const path = c.req.query("path") || "";
  const content = DEMO_FILES[path] || "// Fichier binaire — prévisualisation non disponible";
  return c.json({ path, content });
});

app.post("/files/write", async (c) => {
  const { path, content } = await c.req.json();
  DEMO_FILES[path] = content;
  return c.json({ success: true, path });
});

app.post("/files/mkdir", async (c) => {
  const { path } = await c.req.json();
  const parentPath = path.substring(0, path.lastIndexOf("/"));
  const name = path.substring(path.lastIndexOf("/") + 1);
  if (!DEMO_FS[parentPath]) DEMO_FS[parentPath] = [];
  DEMO_FS[parentPath].push({ name, path, type: "directory", size: 0, modified: new Date().toISOString(), extension: null });
  DEMO_FS[path] = [];
  return c.json({ success: true, path });
});

app.delete("/files/delete", (c) => {
  const path = c.req.query("path") || "";
  const parentPath = path.substring(0, path.lastIndexOf("/"));
  if (DEMO_FS[parentPath]) {
    DEMO_FS[parentPath] = DEMO_FS[parentPath].filter((f: any) => f.path !== path);
  }
  delete DEMO_FS[path];
  delete DEMO_FILES[path];
  return c.json({ success: true });
});

app.get("/files/search", (c) => {
  const q = (c.req.query("q") || "").toLowerCase();
  const results: any[] = [];
  for (const [dir, files] of Object.entries(DEMO_FS)) {
    for (const f of files) {
      if (f.name.toLowerCase().includes(q)) results.push(f);
    }
  }
  return c.json({ results });
});

// ═══════════════════════════════════════════════════
// ══ SERVER PROVISIONING (Hetzner Cloud API) ══════
// ═══════════════════════════════════════════════════

app.get("/server/status", (c) => {
  return c.json({
    status: "demo",
    message: "Mode démo — Connecte un serveur Hetzner dans les paramètres pour activer le PC cloud.",
    server: null,
  });
});

app.post("/server/provision", async (c) => {
  const { hetznerToken, plan } = await c.req.json();
  if (!hetznerToken) return c.json({ error: "Hetzner API token required" }, 400);

  const serverType = plan === "business" ? "cx32" : plan === "pro" ? "cx22" : "cx11";

  try {
    // Create SSH key first
    const sshRes = await fetch("https://api.hetzner.cloud/v1/ssh_keys", {
      method: "POST",
      headers: { Authorization: `Bearer ${hetznerToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "s-rank-agent", public_key: "ssh-ed25519 PLACEHOLDER" }),
    });

    // Create server
    const createRes = await fetch("https://api.hetzner.cloud/v1/servers", {
      method: "POST",
      headers: { Authorization: `Bearer ${hetznerToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "s-rank-agent",
        server_type: serverType,
        image: "ubuntu-24.04",
        location: "fsn1",
        user_data: `#!/bin/bash
apt-get update && apt-get install -y docker.io nodejs npm python3 python3-pip
systemctl enable docker && systemctl start docker
mkdir -p /home/agent/{projects,downloads,scripts}
echo "S-Rank Agent server ready" > /home/agent/README.md
`,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      return c.json({ error: `Hetzner API error: ${err}` }, 400);
    }

    const data = await createRes.json() as any;
    return c.json({
      success: true,
      server: {
        id: data.server?.id,
        ip: data.server?.public_net?.ipv4?.ip,
        status: data.server?.status,
        type: serverType,
      },
      rootPassword: data.root_password,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
