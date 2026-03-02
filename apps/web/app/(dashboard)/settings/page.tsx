"use client";

import { useState, useEffect } from "react";
import { TrustSlider } from "@/components/shared/trust-slider";
import { Key, Server, Activity, ExternalLink, Brain, Trash2, Mail, Wallet, ArrowUpRight, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";

// ── Wallet Component ──
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

    // Handle return from Stripe wallet checkout
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

  if (loading) return <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse h-48" />;

  return (
    <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
      <div className="flex items-center gap-2 mb-1">
        <Wallet size={16} className="text-amber-400" />
        <h2 className="text-sm font-semibold text-white">Wallet Agent</h2>
      </div>
      <p className="text-xs text-zinc-500 mb-4">Solde prépayé pour que ton agent achète des services (domaines, APIs, serveurs).</p>

      {/* Balance */}
      <div className="bg-zinc-950 rounded-xl p-4 mb-4 border border-zinc-800">
        <p className="text-[10px] text-zinc-500 uppercase">Solde disponible</p>
        <p className="text-3xl font-bold text-white">{(wallet?.balance || 0).toFixed(2)}€</p>
        <div className="flex items-center gap-4 mt-2 text-[10px] text-zinc-500">
          <span>Dépensé aujourd&apos;hui: <span className="text-zinc-300">{(wallet?.daily_spent || 0).toFixed(2)}€</span> / {wallet?.daily_limit || 10}€</span>
          <span>Ce mois: <span className="text-zinc-300">{(wallet?.monthly_spent || 0).toFixed(2)}€</span> / {wallet?.monthly_limit || 100}€</span>
        </div>
      </div>

      {/* Top-up */}
      <div className="mb-4">
        <p className="text-xs text-zinc-400 mb-2">Recharger le wallet</p>
        <div className="grid grid-cols-4 gap-2">
          {[10, 25, 50, 100].map(a => (
            <button key={a} onClick={() => topUp(a)} disabled={topUpLoading === a}
              className="py-2 rounded-lg text-sm font-medium bg-zinc-800 border border-zinc-700 hover:border-violet-500/30 text-white transition-colors disabled:opacity-50">
              {topUpLoading === a ? <Loader2 size={14} className="animate-spin mx-auto" /> : `${a}€`}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-zinc-600 mt-1">Paiement sécurisé par Stripe</p>
      </div>

      {/* Limits */}
      <div className="mb-3">
        <p className="text-xs text-zinc-400 mb-2">Limites de dépenses</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Par jour</label>
            <div className="flex items-center gap-1">
              <input value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500" />
              <span className="text-[10px] text-zinc-500">€</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Par mois</label>
            <div className="flex items-center gap-1">
              <input value={monthlyLimit} onChange={(e) => setMonthlyLimit(e.target.value.replace(/[^0-9.]/g, ""))}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500" />
              <span className="text-[10px] text-zinc-500">€</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button onClick={saveLimits} className="px-3 py-1.5 text-xs bg-zinc-800 text-white rounded-lg hover:bg-zinc-700">Sauvegarder</button>
          {limitsSaved && <span className="text-xs text-emerald-400">✓</span>}
        </div>
      </div>

      {/* Recent transactions */}
      {wallet?.transactions?.length > 0 && (
        <div>
          <p className="text-xs text-zinc-400 mb-2">Dernières transactions</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {wallet.transactions.slice(-5).reverse().map((t: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-zinc-950 rounded-lg px-3 py-1.5">
                <div className="flex items-center gap-2">
                  {t.type === "topup" ? <ArrowUpRight size={12} className="text-emerald-400" /> : <ArrowUpRight size={12} className="text-red-400 rotate-180" />}
                  <span className="text-xs text-zinc-300">{t.type === "topup" ? "Recharge" : t.description || "Dépense"}</span>
                </div>
                <span className={`text-xs font-mono ${t.type === "topup" ? "text-emerald-400" : "text-red-400"}`}>
                  {t.type === "topup" ? "+" : "-"}{t.amount}€
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Email Component ──
function EmailCard() {
  const [config, setConfig] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ smtp_host: "", smtp_port: "587", smtp_user: "", smtp_pass: "", from_name: "" });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/email/config").then(r => r.json()).then(c => { setConfig(c); if (c.configured) setEditing(false); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const saveConfig = async () => {
    await fetch("/api/email/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setConfig({ configured: true, email: form.smtp_user, from_name: form.from_name, smtp_host: form.smtp_host });
    setEditing(false);
  };

  const testEmail = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r = await fetch("/api/email/test", { method: "POST" });
      const data = await r.json();
      setTestResult(data.status === "connected" ? "✓ Connexion réussie" : `✗ ${data.error}`);
    } catch (e: any) { setTestResult(`✗ ${e.message}`); }
    finally { setTesting(false); }
  };

  if (loading) return <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 animate-pulse h-32" />;

  return (
    <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
      <div className="flex items-center gap-2 mb-1">
        <Mail size={16} className="text-cyan-400" />
        <h2 className="text-sm font-semibold text-white">Email de l&apos;agent</h2>
      </div>
      <p className="text-xs text-zinc-500 mb-4">L&apos;agent envoie des emails en ton nom — pas comme un bot.</p>

      {config?.configured && !editing ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={14} className="text-emerald-400" />
            <span className="text-xs text-emerald-400">Configuré</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-zinc-950 rounded-lg p-3">
              <p className="text-[10px] text-zinc-500">Adresse</p>
              <p className="text-sm text-white font-mono">{config.email}</p>
            </div>
            <div className="bg-zinc-950 rounded-lg p-3">
              <p className="text-[10px] text-zinc-500">Nom d&apos;expéditeur</p>
              <p className="text-sm text-white">{config.from_name || "—"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={testEmail} disabled={testing} className="px-3 py-1.5 text-xs bg-zinc-800 rounded-lg hover:bg-zinc-700 text-white disabled:opacity-50">
              {testing ? <Loader2 size={12} className="animate-spin" /> : "Tester la connexion"}
            </button>
            <button onClick={() => setEditing(true)} className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white">Modifier</button>
          </div>
          {testResult && <p className={`text-xs mt-2 ${testResult.startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}>{testResult}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Serveur SMTP</label>
              <input value={form.smtp_host} onChange={(e) => setForm({ ...form, smtp_host: e.target.value })} placeholder="smtp.gmail.com"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 placeholder:text-zinc-600" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Port</label>
              <input value={form.smtp_port} onChange={(e) => setForm({ ...form, smtp_port: e.target.value })} placeholder="587"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Adresse email (identifiant SMTP)</label>
            <input value={form.smtp_user} onChange={(e) => setForm({ ...form, smtp_user: e.target.value })} placeholder="ton.nom@gmail.com"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 placeholder:text-zinc-600" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Mot de passe / App Password</label>
            <input type="password" value={form.smtp_pass} onChange={(e) => setForm({ ...form, smtp_pass: e.target.value })} placeholder="••••••••"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500" />
            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-[10px] text-violet-400 hover:text-violet-300 inline-flex items-center gap-0.5 mt-1">
              Créer un App Password Google <ExternalLink size={8} />
            </a>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 block mb-1">Nom d&apos;expéditeur</label>
            <input value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} placeholder="Omar Diallo"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 placeholder:text-zinc-600" />
          </div>
          <div className="flex gap-2">
            <button onClick={saveConfig} className="px-4 py-2 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-500">Sauvegarder</button>
            {config?.configured && <button onClick={() => setEditing(false)} className="px-4 py-2 text-xs text-zinc-400 hover:text-white">Annuler</button>}
          </div>

          <div className="pt-2 border-t border-zinc-800">
            <p className="text-[10px] text-zinc-600">
              <AlertTriangle size={10} className="inline mr-1 text-amber-500" />
              Pour Gmail : active la validation en 2 étapes puis crée un App Password. Pour Outlook : utilise smtp.office365.com:587.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Settings Page ──
export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [memory, setMemory] = useState<any>(null);
  const [memStyle, setMemStyle] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("s-rank-api-key");
    if (stored) { setHasKey(true); setApiKey(stored); }
    fetch("/api/server/status").then(r => r.json()).then(setServerStatus).catch(() => {});
    fetch("/api/memory").then(r => r.json()).then(m => { setMemory(m); setMemStyle(m?.style || ""); }).catch(() => {});
  }, []);

  const saveKey = () => {
    if (!apiKey.startsWith("sk-ant-")) { setMessage("La clé doit commencer par sk-ant-"); return; }
    localStorage.setItem("s-rank-api-key", apiKey); setHasKey(true);
    setMessage("Clé sauvegardée !"); setTimeout(() => setMessage(""), 3000);
  };

  const removeKey = () => {
    localStorage.removeItem("s-rank-api-key"); setApiKey(""); setHasKey(false);
    setMessage("Clé supprimée"); setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
        <h1 className="text-lg font-semibold text-white">Paramètres</h1>

        {/* API Key */}
        <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2 mb-1">
            <Key size={16} className="text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Clé API Claude</h2>
          </div>
          <p className="text-xs text-zinc-500 mb-4">
            Modèle BYOK — ta clé reste dans ton navigateur.{" "}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 inline-flex items-center gap-0.5">
              Obtenir une clé <ExternalLink size={10} />
            </a>
          </p>
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-2 h-2 rounded-full ${hasKey ? "bg-emerald-400" : "bg-red-400"}`} />
            <span className="text-xs text-zinc-400">{hasKey ? "Clé configurée" : "Aucune clé"}</span>
          </div>
          <div className="flex gap-2">
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-api03-..."
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 placeholder:text-zinc-600" />
            <button onClick={saveKey} className="px-4 py-2 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-500">Sauvegarder</button>
          </div>
          {hasKey && <button onClick={removeKey} className="text-xs text-red-400 hover:text-red-300 mt-2">Supprimer la clé</button>}
          {message && <p className="text-xs text-emerald-400 mt-2">{message}</p>}
        </div>

        {/* Trust Slider */}
        <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
          <h2 className="text-sm font-semibold text-white mb-4">Niveau de confiance</h2>
          <TrustSlider />
        </div>

        {/* Email */}
        <EmailCard />

        {/* Wallet */}
        <WalletCard />

        {/* Memory */}
        <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2 mb-1">
            <Brain size={16} className="text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Mémoire long-terme</h2>
          </div>
          <p className="text-xs text-zinc-500 mb-4">L&apos;agent retient tes préférences entre les conversations.</p>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-zinc-500 uppercase block mb-1">Style de communication</label>
              <div className="flex gap-2">
                <input value={memStyle} onChange={(e) => setMemStyle(e.target.value)} placeholder="Ex: Concis et technique, en français"
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 placeholder:text-zinc-600" />
                <button onClick={() => { fetch("/api/memory/style", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ style: memStyle }) }).then(r => r.json()).then(setMemory); }}
                  className="px-3 py-2 text-xs bg-zinc-800 text-white rounded-lg hover:bg-zinc-700">OK</button>
              </div>
            </div>
            {memory?.facts?.length > 0 && (
              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Faits retenus ({memory.facts.length})</label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {memory.facts.map((f: string, i: number) => (
                    <div key={i} className="bg-zinc-950 rounded-lg px-3 py-1.5"><span className="text-xs text-zinc-300">{f}</span></div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => { if (confirm("Effacer toute la mémoire ?")) { fetch("/api/memory", { method: "DELETE" }); setMemory({ preferences: {}, facts: [], style: "", context: "" }); setMemStyle(""); } }}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300"><Trash2 size={12} /> Effacer la mémoire</button>
          </div>
        </div>

        {/* Server */}
        <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2 mb-4">
            <Server size={16} className="text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Serveur</h2>
          </div>
          {serverStatus?.status === "running" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-xs text-emerald-400">En ligne</span></div>
              <div className="grid grid-cols-2 gap-3">
                {[{ label: "IP", value: serverStatus.server?.ip }, { label: "Type", value: serverStatus.server?.type }, { label: "Location", value: serverStatus.server?.location }, { label: "Uptime", value: serverStatus.uptime ? `${Math.round(serverStatus.uptime / 60)} min` : "—" }].map(({ label, value }) => (
                  <div key={label} className="bg-zinc-950 rounded-lg p-3"><p className="text-[10px] text-zinc-500 uppercase">{label}</p><p className="text-sm text-white">{value || "—"}</p></div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-400" /><span className="text-xs text-red-400">Hors ligne</span></div>
          )}
        </div>

        {/* Agent Mode */}
        <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center gap-2 mb-4"><Activity size={16} className="text-emerald-400" /><h2 className="text-sm font-semibold text-white">Mode agent</h2></div>
          <div className="flex gap-3">
            {[{ mode: "on-demand", label: "On-Demand", desc: "Répond quand tu lui parles" }, { mode: "always-on", label: "Always-On", desc: "Travaille en continu (bientôt)", disabled: true }].map(({ mode, label, desc, disabled }) => (
              <button key={mode} disabled={disabled} className={`flex-1 p-4 rounded-xl border text-left transition-all ${mode === "on-demand" ? "border-violet-500 bg-violet-500/5" : "border-zinc-800 opacity-50 cursor-not-allowed"}`}>
                <span className="text-xs font-semibold text-white">{label}</span><p className="text-[10px] text-zinc-500 mt-1">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Billing link */}
        <a href="/settings/billing" className="block p-5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-violet-500/30 transition-colors">
          <div className="flex items-center justify-between">
            <div><h2 className="text-sm font-semibold text-white">Abonnement & Facturation</h2><p className="text-xs text-zinc-500 mt-1">Gérer ton plan, ta carte bancaire, tes factures</p></div>
            <span className="text-zinc-600">→</span>
          </div>
        </a>
      </div>
    </div>
  );
}
