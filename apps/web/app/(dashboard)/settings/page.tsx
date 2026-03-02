"use client";

import { useState, useEffect } from "react";
import { TrustSlider } from "@/components/shared/trust-slider";
import { Key, Activity, Brain, Wallet, Loader2, GitBranch, Mail, CheckCircle, ExternalLink } from "lucide-react";

// ── Orchestrator Toggle ──
function OrchestratorToggle() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => { setEnabled(localStorage.getItem("s-rank-orchestrator") === "true"); }, []);
  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem("s-rank-orchestrator", String(next));
    localStorage.setItem("s-rank-config-event", JSON.stringify({ type: "orchestrator_mode", message: next ? "Mode orchestrateur activé" : "Mode direct activé", ts: Date.now() }));
  };
  return (
    <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch size={16} className="text-amber-400" />
          <div>
            <h2 className="text-sm font-medium text-white">Mode Orchestrateur</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">{enabled ? "Délègue le code aux sub-agents" : "Code directement lui-même"}</p>
          </div>
        </div>
        <button onClick={toggle} className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? "bg-amber-500" : "bg-zinc-700"}`}>
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-[22px]" : "translate-x-0.5"}`} />
        </button>
      </div>
      {enabled && (
        <p className="mt-3 text-[10px] text-amber-400/60 leading-relaxed p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
          Plus lent (+2-5s) mais meilleure qualité sur les projets complexes.
        </p>
      )}
    </div>
  );
}

// ── Email Config Card ──
function EmailCard() {
  const [email, setEmail] = useState("");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const cfg = JSON.parse(localStorage.getItem("s-rank-email-config") || "{}");
      if (cfg.email) setEmail(cfg.email);
      if (cfg.smtpHost) setSmtpHost(cfg.smtpHost);
      if (cfg.smtpPort) setSmtpPort(cfg.smtpPort);
      if (cfg.smtpUser) setSmtpUser(cfg.smtpUser);
      if (cfg.smtpPass) setSmtpPass(cfg.smtpPass);
    } catch {}
  }, []);

  const saveConfig = () => {
    localStorage.setItem("s-rank-email-config", JSON.stringify({ email, smtpHost, smtpPort, smtpUser, smtpPass }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <div className="flex items-center gap-3 mb-4">
        <Mail size={16} className="text-blue-400" />
        <div>
          <h2 className="text-sm font-medium text-white">Email SMTP</h2>
          <p className="text-[11px] text-zinc-500">Pour que l&apos;agent envoie des emails</p>
        </div>
      </div>
      <div className="space-y-3">
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="ton@email.com"
          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50 placeholder:text-zinc-600" />
        <div className="grid grid-cols-2 gap-2">
          <input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com"
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50 placeholder:text-zinc-600" />
          <input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587"
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50 placeholder:text-zinc-600" />
        </div>
        <input value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="Utilisateur SMTP"
          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50 placeholder:text-zinc-600" />
        <input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} placeholder="Mot de passe SMTP"
          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50 placeholder:text-zinc-600" />
        <button onClick={saveConfig}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${saved ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"}`}>
          {saved ? "✓ Sauvegardé" : "Sauvegarder"}
        </button>
      </div>
    </div>
  );
}

// ── Wallet Card ──
function WalletCard() {
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [topUpLoading, setTopUpLoading] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [limitsSaved, setLimitsSaved] = useState(false);

  useEffect(() => {
    fetch("/api/wallet").then(r => r.json()).then(w => {
      setWallet(w); setDailyLimit(String(w.daily_limit || 10)); setMonthlyLimit(String(w.monthly_limit || 100));
    }).catch(() => {}).finally(() => setLoading(false));
    const params = new URLSearchParams(window.location.search);
    if (params.get("wallet_success") === "true") {
      const amount = parseInt(params.get("amount") || "0");
      if (amount > 0) {
        fetch("/api/wallet/topup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, method: "stripe" }) })
          .then(r => r.json()).then(setWallet).catch(() => {});
      }
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  const topUp = async (amount: number) => {
    setTopUpLoading(amount);
    try {
      const res = await fetch("/api/billing/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount }) });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {} finally { setTopUpLoading(null); }
  };

  const saveLimits = () => {
    fetch("/api/wallet/limits", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daily: parseFloat(dailyLimit) || 10, monthly: parseFloat(monthlyLimit) || 100 }) })
      .then(r => r.json()).then(setWallet);
    setLimitsSaved(true);
    setTimeout(() => setLimitsSaved(false), 2000);
  };

  if (loading) return <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] animate-pulse h-48" />;

  return (
    <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <div className="flex items-center gap-3 mb-4">
        <Wallet size={16} className="text-amber-400" />
        <div>
          <h2 className="text-sm font-medium text-white">Wallet Agent</h2>
          <p className="text-[11px] text-zinc-500">Solde prépayé pour achats de services</p>
        </div>
      </div>
      <div className="bg-zinc-950 rounded-xl p-4 mb-4 border border-zinc-800">
        <p className="text-[10px] text-zinc-500 uppercase">Solde</p>
        <p className="text-2xl font-bold text-white">{(wallet?.balance || 0).toFixed(2)}€</p>
        <div className="flex items-center gap-4 mt-1 text-[10px] text-zinc-500">
          <span>Jour: {(wallet?.daily_spent || 0).toFixed(2)}€ / {wallet?.daily_limit || 10}€</span>
          <span>Mois: {(wallet?.monthly_spent || 0).toFixed(2)}€ / {wallet?.monthly_limit || 100}€</span>
        </div>
      </div>
      <p className="text-[11px] text-zinc-400 mb-2">Recharger</p>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[10, 25, 50, 100].map(a => (
          <button key={a} onClick={() => topUp(a)} disabled={topUpLoading === a}
            className="py-2 rounded-lg text-xs font-medium bg-zinc-800/50 border border-zinc-700 hover:border-blue-500/30 text-white transition-colors disabled:opacity-50">
            {topUpLoading === a ? <Loader2 size={14} className="animate-spin mx-auto" /> : `${a}€`}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-zinc-400 mb-2">Limites</p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-[10px] text-zinc-500 block mb-1">Par jour (€)</label>
          <input value={dailyLimit} onChange={e => setDailyLimit(e.target.value.replace(/[^0-9.]/g, ""))}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50" />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 block mb-1">Par mois (€)</label>
          <input value={monthlyLimit} onChange={e => setMonthlyLimit(e.target.value.replace(/[^0-9.]/g, ""))}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50" />
        </div>
      </div>
      <button onClick={saveLimits}
        className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${limitsSaved ? "bg-emerald-600 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"}`}>
        {limitsSaved ? "✓ Sauvegardé" : "Sauvegarder les limites"}
      </button>
    </div>
  );
}

// ── Agent Mode Section ──
function AgentModeCard() {
  const [mode, setMode] = useState<"on-demand" | "always-on">("on-demand");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("s-rank-agent-mode");
    if (stored === "always-on") setMode("always-on");
  }, []);

  const updateMode = async (newMode: "on-demand" | "always-on") => {
    if (saving || mode === newMode) return;
    setSaving(true);
    setMode(newMode);
    localStorage.setItem("s-rank-agent-mode", newMode);

    // Notify chat
    localStorage.setItem("s-rank-config-event", JSON.stringify({
      type: "agent_mode", message: newMode === "always-on" ? "Mode Always-On activé — l'agent travaille en continu" : "Mode On-Demand activé — l'agent attend tes instructions", ts: Date.now(),
    }));

    // Try API save (non-blocking)
    try {
      await fetch("/api/settings/agent-mode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: newMode }) });
    } catch {}
    setSaving(false);
  };

  const modes = [
    { id: "on-demand" as const, label: "On-Demand", desc: "Répond quand tu lui parles", icon: "⏱" },
    { id: "always-on" as const, label: "Always-On", desc: "Travaille en continu 24/7", icon: "⚡" },
  ];

  return (
    <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <div className="flex items-center gap-3 mb-4">
        <Activity size={16} className="text-emerald-400" />
        <div>
          <h2 className="text-sm font-medium text-white">Mode Agent</h2>
          <p className="text-[11px] text-zinc-500">Comment l&apos;agent travaille</p>
        </div>
      </div>
      <div className="flex gap-2">
        {modes.map(m => (
          <button key={m.id} onClick={() => updateMode(m.id)} disabled={saving}
            className={`flex-1 p-3.5 rounded-xl border text-left transition-all ${
              mode === m.id ? "border-blue-500/40 bg-blue-500/5" : "border-white/[0.06] hover:border-white/[0.12] bg-white/[0.01]"
            } ${saving ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-2">
              <span className="text-base">{m.icon}</span>
              <div>
                <span className="text-xs font-medium text-white">{m.label}</span>
                <p className="text-[10px] text-zinc-500 mt-0.5">{m.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-zinc-600 mt-3">
        {mode === "on-demand" ? "L'agent attend tes instructions pour agir" : "L'agent exécute les tâches de fond et crons automatiquement"}
      </p>
    </div>
  );
}

// ── Model Selector Card ──
function ModelCard() {
  const models = [
    { id: "claude-sonnet-4-20250514", name: "Sonnet 4", desc: "Rapide & intelligent", cost: "3$/M tokens", badge: "Recommandé", color: "blue" },
    { id: "claude-haiku-3-5-20241022", name: "Haiku 3.5", desc: "Ultra rapide & économique", cost: "0.25$/M tokens", badge: "Économique", color: "emerald" },
    { id: "claude-opus-4-20250514", name: "Opus 4", desc: "Le plus puissant", cost: "15$/M tokens", badge: "Premium", color: "purple" },
  ];

  const [selected, setSelected] = useState(() => {
    try { return localStorage.getItem("s-rank-model") || "claude-sonnet-4-20250514"; } catch { return "claude-sonnet-4-20250514"; }
  });
  const [saved, setSaved] = useState(false);

  const selectModel = (id: string) => {
    setSelected(id);
    localStorage.setItem("s-rank-model", id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Brain size={16} className="text-cyan-400" />
          <div>
            <h2 className="text-sm font-medium text-white">Modèle IA</h2>
            <p className="text-[11px] text-zinc-500">Choisis le modèle Claude pour l&apos;agent</p>
          </div>
        </div>
        {saved && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle size={12} /> Sauvé</span>}
      </div>
      <div className="space-y-2">
        {models.map(m => {
          const isActive = selected === m.id;
          const borderColor = isActive
            ? m.color === "blue" ? "border-blue-500/40 bg-blue-500/5"
            : m.color === "emerald" ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-purple-500/40 bg-purple-500/5"
            : "border-white/[0.06] hover:border-white/[0.12] bg-white/[0.01]";
          const badgeColor = m.color === "blue" ? "bg-blue-500/10 text-blue-400"
            : m.color === "emerald" ? "bg-emerald-500/10 text-emerald-400"
            : "bg-purple-500/10 text-purple-400";
          return (
            <button key={m.id} onClick={() => selectModel(m.id)}
              className={`w-full p-3.5 rounded-xl border text-left transition-all ${borderColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full border-2 ${isActive ? "border-white bg-white" : "border-zinc-600"}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white">{m.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${badgeColor}`}>{m.badge}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{m.desc}</p>
                  </div>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">{m.cost}</span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <p className="text-[10px] text-zinc-500 leading-relaxed">
          💡 <strong className="text-zinc-400">Haiku</strong> = idéal pour les tâches simples (scripts, fichiers).
          <strong className="text-zinc-400"> Sonnet</strong> = meilleur rapport qualité/prix.
          <strong className="text-zinc-400"> Opus</strong> = raisonnement complexe, projets lourds.
        </p>
      </div>
    </div>
  );
}

// ── Main Settings Page ──
export default function SettingsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-white">Paramètres</h1>
          <p className="text-xs text-zinc-500 mt-1">Configure ton agent S-Rank.</p>
        </div>

        <ModelCard />
        <AgentModeCard />

        <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center gap-3 mb-4">
            <Brain size={16} className="text-purple-400" />
            <div>
              <h2 className="text-sm font-medium text-white">Niveau de confiance</h2>
              <p className="text-[11px] text-zinc-500">Contrôle l&apos;autonomie de l&apos;agent</p>
            </div>
          </div>
          <TrustSlider />
        </div>

        <OrchestratorToggle />
        <EmailCard />
        <WalletCard />
      </div>
    </div>
  );
}
