"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Info, CheckCircle, XCircle, Loader2, Power } from "lucide-react";

interface Connector {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  enabled: boolean;
  token: string;
  status: "connected" | "error" | "disconnected";
  tokenGuide: string;
  tokenPlaceholder: string;
}

const DEFAULT_CONNECTORS: Connector[] = [
  { id: "github", name: "GitHub", icon: "🐙", description: "Clone, commit, push, PRs, issues", category: "Code",
    enabled: false, token: "", status: "disconnected", tokenGuide: "https://github.com/settings/tokens", tokenPlaceholder: "ghp_..." },
  { id: "slack", name: "Slack", icon: "💬", description: "Messages, channels, notifications", category: "Communication",
    enabled: false, token: "", status: "disconnected", tokenGuide: "https://api.slack.com/apps", tokenPlaceholder: "xoxb-..." },
  { id: "gdrive", name: "Google Drive", icon: "📁", description: "Upload, download, partage", category: "Stockage",
    enabled: false, token: "", status: "disconnected", tokenGuide: "https://console.cloud.google.com/apis/credentials", tokenPlaceholder: "ya29...." },
  { id: "postgres", name: "PostgreSQL", icon: "🐘", description: "Requêtes SQL, migrations, backups", category: "Base de données",
    enabled: false, token: "", status: "disconnected", tokenGuide: "", tokenPlaceholder: "postgresql://user:pass@host/db" },
  { id: "stripe", name: "Stripe", icon: "💳", description: "Paiements, clients, produits", category: "APIs",
    enabled: false, token: "", status: "disconnected", tokenGuide: "https://dashboard.stripe.com/apikeys", tokenPlaceholder: "sk_test_..." },
  { id: "vercel", name: "Vercel", icon: "▲", description: "Déployer, preview, logs", category: "Déploiement",
    enabled: false, token: "", status: "disconnected", tokenGuide: "https://vercel.com/account/tokens", tokenPlaceholder: "vcp_..." },
  { id: "clerk", name: "Clerk", icon: "🔐", description: "Utilisateurs, sessions, bans", category: "Auth",
    enabled: false, token: "", status: "disconnected", tokenGuide: "https://dashboard.clerk.com/last-active?path=api-keys", tokenPlaceholder: "sk_test_..." },
];

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>(DEFAULT_CONNECTORS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("s-rank-connectors");
    if (stored) {
      try {
        const saved = JSON.parse(stored) as Record<string, { enabled: boolean; token: string; status: string }>;
        setConnectors((prev) => prev.map((c) => saved[c.id] ? { ...c, ...saved[c.id] } as Connector : c));
      } catch {}
    }
  }, []);

  const save = (updated: Connector[]) => {
    setConnectors(updated);
    const data: Record<string, any> = {};
    updated.forEach((c) => { data[c.id] = { enabled: c.enabled, token: c.token, status: c.status }; });
    localStorage.setItem("s-rank-connectors", JSON.stringify(data));
    // Update active connectors for chat
    const active = updated.filter(c => c.enabled && c.status === "connected").map(c => `${c.name} (${c.description})`);
    localStorage.setItem("s-rank-active-connectors", JSON.stringify(active));
  };

  const toggleConnector = (id: string) => {
    const updated = connectors.map((c) => c.id === id ? { ...c, enabled: !c.enabled, status: !c.enabled && c.token ? "connected" : "disconnected" } as Connector : c);
    save(updated);
    const conn = connectors.find(c => c.id === id);
    if (conn) {
      const nowEnabled = !conn.enabled;
      localStorage.setItem("s-rank-config-event", JSON.stringify({
        type: "connector_toggled", message: nowEnabled ? `${conn.name} connecté ✓` : `${conn.name} déconnecté`, ts: Date.now(),
      }));
      if (nowEnabled) {
        try {
          const agent = JSON.parse(localStorage.getItem("s-rank-agent") || "{}");
          if (agent.xp !== undefined) { agent.xp += 30; agent.totalConnectors = (agent.totalConnectors || 0) + 1; localStorage.setItem("s-rank-agent", JSON.stringify(agent)); }
          localStorage.setItem("s-rank-xp-event", JSON.stringify({ amount: 30, reason: "connector", ts: Date.now() }));
        } catch {}
      }
    }
  };

  const saveToken = (id: string, token: string) => {
    const updated = connectors.map((c) => c.id === id ? { ...c, token, status: token ? "connected" : "disconnected", enabled: !!token } as Connector : c);
    save(updated);
    setEditingId(null);
    setTokenInput("");
    if (token) setTimeout(() => testConnector(id), 100);
  };

  const testConnector = async (id: string) => {
    setTestingId(id);
    const c = connectors.find((c) => c.id === id);
    if (!c?.token) { setTestingId(null); return; }
    try {
      const response = await fetch(`/api/mcp/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-connector-token": c.token },
        body: JSON.stringify({ action: "verify" })
      });
      const result = await response.json();
      const updated = connectors.map((conn) => conn.id === id ? { ...conn, status: result.success ? "connected" : "error" } as Connector : conn);
      save(updated);
    } catch {
      const updated = connectors.map((conn) => conn.id === id ? { ...conn, status: "error" } as Connector : conn);
      save(updated);
    } finally { setTestingId(null); }
  };

  const connected = connectors.filter(c => c.status === "connected").length;
  const categories = [...new Set(connectors.map((c) => c.category))];

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold text-white">Connecteurs MCP</h1>
          <p className="text-xs text-zinc-500 mt-1">{connected} connecteur{connected !== 1 ? "s" : ""} actif{connected !== 1 ? "s" : ""} sur {connectors.length}</p>
        </div>

        {/* Status bar */}
        <div className="flex gap-2">
          {connectors.map(c => (
            <div key={c.id} className={`h-1.5 flex-1 rounded-full transition-colors ${
              c.status === "connected" ? "bg-emerald-500" : c.status === "error" ? "bg-red-500" : "bg-zinc-800"
            }`} title={c.name} />
          ))}
        </div>

        {/* Connectors by category */}
        {categories.map(cat => (
          <div key={cat}>
            <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">{cat}</p>
            <div className="space-y-2">
              {connectors.filter(c => c.category === cat).map(c => (
                <div key={c.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{c.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{c.name}</span>
                          {c.status === "connected" && <CheckCircle size={12} className="text-emerald-400" />}
                          {c.status === "error" && <XCircle size={12} className="text-red-400" />}
                          {testingId === c.id && <Loader2 size={12} className="text-blue-400 animate-spin" />}
                        </div>
                        <p className="text-[11px] text-zinc-500">{c.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.token && (
                        <button onClick={() => toggleConnector(c.id)}
                          className={`w-9 h-5 rounded-full transition-colors relative ${c.enabled ? "bg-emerald-500" : "bg-zinc-700"}`}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${c.enabled ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Token editing */}
                  {editingId === c.id ? (
                    <div className="mt-3 space-y-2">
                      <input
                        type="password"
                        value={tokenInput}
                        onChange={e => setTokenInput(e.target.value)}
                        placeholder={c.tokenPlaceholder}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50 placeholder:text-zinc-600"
                        onKeyDown={(e) => { if (e.key === "Enter") saveToken(c.id, tokenInput); }}
                        autoFocus
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {c.tokenGuide && (
                            <a href={c.tokenGuide} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-blue-400/70 hover:text-blue-400 flex items-center gap-1">
                              <Info size={10} />Obtenir un token<ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingId(null); setTokenInput(""); }}
                            className="px-3 py-1 text-[11px] text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800">Annuler</button>
                          <button onClick={() => saveToken(c.id, tokenInput)}
                            className="px-3 py-1 text-[11px] text-white rounded-lg bg-blue-600 hover:bg-blue-500">Sauvegarder</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`text-[10px] ${
                        c.status === "connected" ? "text-emerald-400/70" : c.status === "error" ? "text-red-400/70" : "text-zinc-600"
                      }`}>
                        {c.status === "connected" ? "✓ Connecté" : c.status === "error" ? "✗ Erreur de connexion" : "Non configuré"}
                      </span>
                      <div className="flex gap-2">
                        {c.token && c.status !== "connected" && (
                          <button onClick={() => testConnector(c.id)} disabled={testingId === c.id}
                            className="px-2.5 py-1 text-[10px] text-zinc-400 hover:text-white rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
                            Retester
                          </button>
                        )}
                        <button onClick={() => { setEditingId(c.id); setTokenInput(c.token); }}
                          className="px-2.5 py-1 text-[10px] text-zinc-400 hover:text-white rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
                          {c.token ? "Modifier" : "Configurer"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
