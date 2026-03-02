"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Info, CheckCircle, XCircle, Loader2 } from "lucide-react";

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
  { id: "github", name: "GitHub", icon: "🐙", description: "Clone, commit, push, pull requests, issues", category: "Code",
    enabled: false, token: "", status: "disconnected", tokenGuide: "https://github.com/settings/tokens", tokenPlaceholder: "ghp_..." },
  { id: "slack", name: "Slack", icon: "💬", description: "Envoyer/lire des messages, channels", category: "Communication",
    enabled: false, token: "", status: "disconnected", tokenGuide: "https://api.slack.com/apps", tokenPlaceholder: "xoxb-..." },
  { id: "gdrive", name: "Google Drive", icon: "📁", description: "Upload, download, partage de fichiers", category: "Stockage",
    enabled: false, token: "", status: "disconnected", tokenGuide: "https://console.cloud.google.com/apis/credentials", tokenPlaceholder: "ya29...." },
  { id: "postgres", name: "PostgreSQL", icon: "🐘", description: "Requêtes SQL, migrations, backups", category: "Base de données",
    enabled: false, token: "", status: "disconnected", tokenGuide: "", tokenPlaceholder: "postgresql://user:pass@host/db" },
  { id: "stripe", name: "Stripe", icon: "💳", description: "Paiements, clients, webhooks", category: "APIs",
    enabled: false, token: "", status: "disconnected", tokenGuide: "https://dashboard.stripe.com/apikeys", tokenPlaceholder: "sk_test_..." },
  { id: "vercel", name: "Vercel", icon: "▲", description: "Déployer, preview, logs", category: "Déploiement",
    enabled: false, token: "", status: "disconnected", tokenGuide: "https://vercel.com/account/tokens", tokenPlaceholder: "vcp_..." },
  { id: "clerk", name: "Clerk", icon: "🔐", description: "Gérer utilisateurs, sessions, invitations, bans", category: "Auth",
    enabled: false, token: "", status: "disconnected", tokenGuide: "https://dashboard.clerk.com/last-active?path=api-keys", tokenPlaceholder: "sk_test_..." },
];

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>(DEFAULT_CONNECTORS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

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
  };

  const toggleConnector = (id: string) => {
    const updated = connectors.map((c) => c.id === id ? { ...c, enabled: !c.enabled, status: !c.enabled && c.token ? "connected" : "disconnected" } : c);
    save(updated);
    const conn = connectors.find(c => c.id === id);
    if (conn) {
      const nowEnabled = !conn.enabled;
      // Save active connectors list for chat system prompt
      const active = updated.filter(c => c.enabled && c.status === "connected").map(c => `${c.name} (${c.description})`);
      localStorage.setItem("s-rank-active-connectors", JSON.stringify(active));
      // Broadcast to chat
      localStorage.setItem("s-rank-config-event", JSON.stringify({
        type: "connector_toggled",
        message: nowEnabled ? `${conn.name} connecté ✓` : `${conn.name} déconnecté`,
        ts: Date.now(),
      }));
      // Grant XP
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
    const updated = connectors.map((c) => c.id === id ? { ...c, token, status: token ? "connected" : "disconnected", enabled: !!token } : c);
    save(updated);
    const active = updated.filter(c => c.enabled && c.status === "connected").map(c => `${c.name} (${c.description})`);
    localStorage.setItem("s-rank-active-connectors", JSON.stringify(active));
    const conn = connectors.find(c => c.id === id);
    if (conn && token) {
      localStorage.setItem("s-rank-config-event", JSON.stringify({
        type: "connector_configured",
        message: `${conn.name} configuré et prêt ✓`,
        ts: Date.now(),
      }));
    }
    setEditingId(null);
  };

  const testConnector = async (id: string) => {
    setTestingId(id);
    // Simulate test — in production this would call the VPS API
    await new Promise((r) => setTimeout(r, 1500));
    const c = connectors.find((c) => c.id === id);
    const ok = !!(c?.token);
    save(connectors.map((c) => c.id === id ? { ...c, status: ok ? "connected" : "error" } : c));
    setTestingId(null);
  };

  const categories = [...new Set(connectors.map((c) => c.category))];

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-white">Connecteurs MCP</h1>
            <p className="text-xs text-zinc-500 mt-1">Connecte tes services en 1 clic</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            {connectors.filter((c) => c.status === "connected").length} actifs
          </div>
        </div>

        {categories.map((cat) => (
          <div key={cat} className="mb-6">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">{cat}</h2>
            <div className="space-y-3">
              {connectors.filter((c) => c.category === cat).map((connector) => (
                <div key={connector.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{connector.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{connector.name}</span>
                        {connector.status === "connected" && <CheckCircle size={14} className="text-emerald-400" />}
                        {connector.status === "error" && <XCircle size={14} className="text-red-400" />}
                      </div>
                      <p className="text-xs text-zinc-500">{connector.description}</p>
                    </div>

                    {/* Toggle */}
                    <button onClick={() => toggleConnector(connector.id)}
                      className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${
                        connector.enabled ? "bg-violet-600" : "bg-zinc-700"
                      }`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        connector.enabled ? "translate-x-5" : "translate-x-0"
                      }`} />
                    </button>
                  </div>

                  {/* Token section */}
                  {connector.enabled && (
                    <div className="mt-3 pt-3 border-t border-zinc-800">
                      {editingId === connector.id ? (
                        <div className="flex gap-2">
                          <input
                            type="password"
                            defaultValue={connector.token}
                            placeholder={connector.tokenPlaceholder}
                            className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveToken(connector.id, (e.target as HTMLInputElement).value);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            autoFocus
                          />
                          <button onClick={(e) => {
                            const input = (e.target as HTMLElement).parentElement?.querySelector("input") as HTMLInputElement;
                            saveToken(connector.id, input?.value || "");
                          }} className="px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg">OK</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">
                              {connector.token ? `${connector.token.substring(0, 8)}${"•".repeat(12)}` : "Pas de token"}
                            </span>
                            {connector.tokenGuide && (
                              <a href={connector.tokenGuide} target="_blank" rel="noopener noreferrer"
                                className="text-violet-400 hover:text-violet-300">
                                <Info size={14} />
                              </a>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingId(connector.id)}
                              className="px-2 py-1 text-xs bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700">
                              {connector.token ? "Modifier" : "Ajouter token"}
                            </button>
                            {connector.token && (
                              <button onClick={() => testConnector(connector.id)} disabled={testingId === connector.id}
                                className="px-2 py-1 text-xs bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 disabled:opacity-50">
                                {testingId === connector.id ? <Loader2 size={12} className="animate-spin" /> : "Tester"}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
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
