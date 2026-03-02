"use client";

import { useState, useEffect } from "react";
import { Cpu, HardDrive, Activity, DollarSign, Clock, Wifi, WifiOff, RefreshCw } from "lucide-react";

interface Metrics {
  cpu: number;
  memUsed: number;
  memTotal: number;
  uptime: number;
}

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/server/metrics");
      const data = await res.json();
      setMetrics(data);
    } catch { setMetrics(null); }
    setLoading(false);
  };

  useEffect(() => { fetchMetrics(); }, []);
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const memPercent = metrics ? Math.round((metrics.memUsed / metrics.memTotal) * 100) : 0;
  const uptimeStr = metrics ? (() => {
    const h = Math.floor(metrics.uptime / 3600);
    const m = Math.floor((metrics.uptime % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  })() : "—";

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-white">Monitoring</h1>
            <p className="text-xs text-zinc-500 mt-1">Métriques serveur en temps réel</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg ${autoRefresh ? "bg-emerald-600/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
              {autoRefresh ? <Wifi size={12} /> : <WifiOff size={12} />}
              {autoRefresh ? "Live" : "Paused"}
            </button>
            <button onClick={fetchMetrics} className="p-1 text-zinc-500 hover:text-white">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className={`flex items-center gap-2 mb-6 p-3 rounded-lg ${metrics ? "bg-emerald-600/10 border border-emerald-800/30" : "bg-red-600/10 border border-red-800/30"}`}>
          <span className={`w-2 h-2 rounded-full ${metrics ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          <span className={`text-xs font-medium ${metrics ? "text-emerald-400" : "text-red-400"}`}>
            {metrics ? "Serveur en ligne — 46.225.103.230" : "Serveur hors ligne"}
          </span>
        </div>

        {/* Metrics cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Cpu size={14} className="text-cyan-400" />
              <span className="text-xs text-zinc-500">CPU</span>
            </div>
            <p className="text-2xl font-bold text-white">{metrics?.cpu || 0}</p>
            <p className="text-[10px] text-zinc-600">vCPU cores</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive size={14} className="text-violet-400" />
              <span className="text-xs text-zinc-500">RAM</span>
            </div>
            <p className="text-2xl font-bold text-white">{memPercent}%</p>
            <p className="text-[10px] text-zinc-600">{metrics?.memUsed || 0} / {metrics?.memTotal || 0} MB</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-emerald-400" />
              <span className="text-xs text-zinc-500">Uptime</span>
            </div>
            <p className="text-2xl font-bold text-white">{uptimeStr}</p>
            <p className="text-[10px] text-zinc-600">depuis le boot</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={14} className="text-yellow-400" />
              <span className="text-xs text-zinc-500">Coût serveur</span>
            </div>
            <p className="text-2xl font-bold text-white">3.95€</p>
            <p className="text-[10px] text-zinc-600">/mois (CAX11)</p>
          </div>
        </div>

        {/* RAM Bar */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">Utilisation mémoire</span>
            <span className="text-xs text-zinc-500">{metrics?.memUsed || 0} / {metrics?.memTotal || 0} MB</span>
          </div>
          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${memPercent > 80 ? "bg-red-500" : memPercent > 50 ? "bg-yellow-500" : "bg-emerald-500"}`}
              style={{ width: `${memPercent}%` }} />
          </div>
        </div>

        {/* Server Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-white mb-3">Informations serveur</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "IP", value: "46.225.103.230" },
              { label: "Type", value: "CAX11 (ARM)" },
              { label: "OS", value: "Ubuntu 24.04" },
              { label: "Location", value: "Nuremberg, DE" },
              { label: "CPU", value: "2 vCPU Ampere" },
              { label: "RAM", value: "4 GB" },
              { label: "Stockage", value: "40 GB SSD" },
              { label: "Hébergeur", value: "Hetzner Cloud" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-1.5 border-b border-zinc-800/50 last:border-0">
                <span className="text-xs text-zinc-500">{label}</span>
                <span className="text-xs text-white font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* API Costs placeholder */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={14} className="text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Coûts API Claude</h2>
          </div>
          <p className="text-xs text-zinc-500">Le tracking des tokens sera disponible prochainement. En attendant, consulte ton dashboard Anthropic :</p>
          <a href="https://console.anthropic.com/settings/usage" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 mt-2">
            console.anthropic.com/usage →
          </a>
        </div>
      </div>
    </div>
  );
}
