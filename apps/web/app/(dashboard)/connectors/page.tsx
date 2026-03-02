"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Info, CheckCircle, XCircle, Loader2, Settings, Zap, Clock } from "lucide-react";

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
  mode?: "on-demand" | "always-on";
}

const DEFAULT_CONNECTORS: Connector[] = [
  { id: "github", name: "GitHub", icon: "🐙", description: "Clone, commit, push, pull requests, issues", category: "Code",
    enabled: false, token: "", status: "disconnected", tokenGuide: "https://github.com/settings/tokens", tokenPlaceholder: "ghp_...", mode: "on-demand" },
  { id: "slack", name: "Slack", icon: "💬", description: "Envoyer/lire des messages, channels", category: "Communication",
    enabled: false, token: "", status: "disconnected", tokenGuide: "https://api.slack.com/apps", tokenPlaceholder: "xoxb-...", mode: "on-demand" },
  { id: "gdrive", name: "Google Drive", icon: "📁", description: "Upload, download, partage de fichiers", category: "Stockage",
    enabled: false, token: "", status: "disconnected", tokenGuide: "https://console.cloud.google.com/apis/credentials", tokenPlaceholder: "ya29....", mode: "on-demand" },
  { id: "postgres", name: "PostgreSQL", icon: "🐘", description: "Requêtes SQL, migrations, backups", category: "Base de données",
    enabled: false, token: "", status: "disconnected", tokenGuide: "", tokenPlaceholder: "postgresql://user:pass@host/db", mode: "on-demand" },
  { id: "stripe", name: "Stripe", icon: "💳", description: "Paiements, clients, webhooks", category: "APIs",
    enabled: false, token: "", status: "disconnected", tokenGuide: "https://dashboard.stripe.com/apikeys", tokenPlaceholder: "sk_test_...", mode: "on-demand" },
  { id: "vercel", name: "Vercel", icon: "▲", description: "Déployer, preview, logs", category: "Déploiement",
    enabled: false, token: "", status: "disconnected", tokenGuide: "https://vercel.com/account/tokens", tokenPlaceholder: "vcp_...", mode: "on-demand" },
  { id: "clerk", name: "Clerk", icon: "🔐", description: "Gérer utilisateurs, sessions, invitations, bans", category: "Auth",
    enabled: false, token: "", status: "disconnected", tokenGuide: "https://dashboard.clerk.com/last-active?path=api-keys", tokenPlaceholder: "sk_test_...", mode: "on-demand" },
];

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>(DEFAULT_CONNECTORS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [agentMode, setAgentMode] = useState<"on-demand" | "always-on">("on-demand");

  useEffect(() => {
    const stored = localStorage.getItem("s-rank-connectors");
    if (stored) {
      try {
        const saved = JSON.parse(stored) as Record<string, { enabled: boolean; token: string; status: string; mode?: string }>;
        setConnectors((prev) => prev.map((c) => saved[c.id] ? { ...c, ...saved[c.id] } as Connector : c));
      } catch {}
    }
    
    // Load agent mode from API or localStorage
    const storedMode = localStorage.getItem("s-rank-agent-mode");
    if (storedMode && ["on-demand", "always-on"].includes(storedMode)) {
      setAgentMode(storedMode as "on-demand" | "always-on");
    }
  }, []);

  const save = (updated: Connector[]) => {
    setConnectors(updated);
    const data: Record<string, any> = {};
    updated.forEach((c) => { data[c.id] = { enabled: c.enabled, token: c.token, status: c.status, mode: c.mode }; });
    localStorage.setItem("s-rank-connectors", JSON.stringify(data));
  };

  const updateAgentMode = async (newMode: "on-demand" | "always-on") => {
    setAgentMode(newMode);
    localStorage.setItem("s-rank-agent-mode", newMode);
    
    // Call API to save in database
    try {
      await fetch("/api/settings/agent-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode })
      });
    } catch (error) {
      console.error("Failed to save agent mode:", error);
    }
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

  const updateConnectorMode = (id: string, mode: "on-demand" | "always-on") => {
    const updated = connectors.map((c) => c.id === id ? { ...c, mode } : c);
    save(updated);
  };

  const saveToken = (id: string, token: string) => {
    const updated = connectors.map((c) => c.id === id ? { ...c, token, status: token ? "testing" : "disconnected", enabled: !!token } : c);
    save(updated);
    const active = updated.filter(c => c.enabled && c.status === "connected").map(c => `${c.name} (${c.description})`);
    localStorage.setItem("s-rank-active-connectors", JSON.stringify(active));
    setEditingId(null);
    // Auto-verify the token
    if (token) {
      setTimeout(() => testConnector(id), 100);
    }
  };

  const testConnector = async (id: string) => {
    setTestingId(id);
    const c = connectors.find((c) => c.id === id);
    if (!c?.token) { setTestingId(null); return; }

    try {
      const response = await fetch(`/api/mcp/${id}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-connector-token": c.token,
          "x-connector-mode": c.mode || "on-demand"
        },
        body: JSON.stringify({ action: "verify" })
      });

      const result = await response.json();
      const updated = connectors.map((conn) => 
        conn.id === id ? { ...conn, status: result.success ? "connected" : "error" } as Connector : conn
      );
      save(updated);
    } catch (error) {
      const updated = connectors.map((conn) => 
        conn.id === id ? { ...conn, status: "error" } as Connector : conn
      );
      save(updated);
    } finally {
      setTestingId(null);
    }
  };

  const categories = [...new Set(connectors.map((c) => c.category))];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Connecteurs MCP
        </h1>
        <p className="text-gray-400 mb-6">
          Configurez les intégrations pour étendre les capacités de votre agent S-Rank.
        </p>

        {/* Global Agent Mode */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Mode Agent Global
          </h2>
          <div className="grid grid-cols-2 gap-4 max-w-2xl">
            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                agentMode === "on-demand" 
                  ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20" 
                  : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
              }`}
              onClick={() => updateAgentMode("on-demand")}
            >
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-blue-500" />
                <div>
                  <div className="font-medium text-white">On Demand</div>
                  <div className="text-sm text-gray-400">
                    Actions sur confirmation
                  </div>
                </div>
              </div>
            </div>

            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                agentMode === "always-on" 
                  ? "border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20" 
                  : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
              }`}
              onClick={() => updateAgentMode("always-on")}
            >
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-green-500" />
                <div>
                  <div className="font-medium text-white">Always On</div>
                  <div className="text-sm text-gray-400">
                    Actions automatiques
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            {agentMode === "on-demand" 
              ? "L'agent demandera confirmation avant d'exécuter des actions sensibles"
              : "L'agent exécutera toutes les actions automatiquement sans confirmation"
            }
          </p>
        </div>
      </div>

      {categories.map((category) => (
        <div key={category} className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connectors.filter((c) => c.category === category).map((connector) => (
              <div key={connector.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{connector.icon}</span>
                    <div>
                      <h3 className="font-medium text-white">{connector.name}</h3>
                      <p className="text-sm text-gray-400">{connector.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {connector.status === "connected" && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {connector.status === "error" && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    {testingId === connector.id && (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    )}
                  </div>
                </div>

                {/* Connector Mode (only show if connected) */}
                {connector.enabled && connector.status === "connected" && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-400 mb-2">Mode connecteur :</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateConnectorMode(connector.id, "on-demand")}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          connector.mode === "on-demand"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600"
                        }`}
                      >
                        <Clock className="w-3 h-3 inline mr-1" />
                        On Demand
                      </button>
                      <button
                        onClick={() => updateConnectorMode(connector.id, "always-on")}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          connector.mode === "always-on"
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600"
                        }`}
                      >
                        <Zap className="w-3 h-3 inline mr-1" />
                        Always On
                      </button>
                    </div>
                  </div>
                )}

                {editingId === connector.id ? (
                  <div className="space-y-3">
                    <input
                      type="password"
                      placeholder={connector.tokenPlaceholder}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          saveToken(connector.id, e.currentTarget.value);
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex justify-between">
                      {connector.tokenGuide && (
                        <a
                          href={connector.tokenGuide}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <Info className="w-3 h-3" />
                          Guide token
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      {connector.enabled ? (
                        <span className={`inline-flex items-center gap-1 ${
                          connector.status === "connected" ? "text-green-400" : 
                          connector.status === "error" ? "text-red-400" : "text-yellow-400"
                        }`}>
                          {connector.status === "connected" && <CheckCircle className="w-4 h-4" />}
                          {connector.status === "error" && <XCircle className="w-4 h-4" />}
                          {connector.status === "testing" && <Loader2 className="w-4 h-4 animate-spin" />}
                          {connector.status === "connected" ? "Connecté" : 
                           connector.status === "error" ? "Erreur" : "Test..."}
                        </span>
                      ) : (
                        <span className="text-gray-500">Non configuré</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingId(connector.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                      >
                        {connector.token ? "Modifier" : "Configurer"}
                      </button>
                      {connector.token && (
                        <button
                          onClick={() => toggleConnector(connector.id)}
                          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                            connector.enabled
                              ? "bg-red-600 hover:bg-red-700 text-white"
                              : "bg-green-600 hover:bg-green-700 text-white"
                          }`}
                        >
                          {connector.enabled ? "Désactiver" : "Activer"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
