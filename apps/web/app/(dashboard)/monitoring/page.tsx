"use client";

import { useState, useEffect } from "react";
import { useApi } from "@/lib/hooks/use-api";
import { StatCard } from "@/components/monitoring/stat-card";
import { ResourceBar } from "@/components/monitoring/resource-bar";
import { ActivityLog } from "@/components/monitoring/activity-log";

interface Usage {
  totalInput: number;
  totalOutput: number;
  totalCost: number;
  messageCount: number;
}

interface Metrics {
  cpuPercent: number;
  ramUsedMb: number;
  ramTotalMb: number;
  diskUsedGb: number;
  diskTotalGb: number;
  uptimeSeconds: number;
}

interface LogEntry {
  id: string;
  action: string;
  description: string;
  status: "success" | "error";
  costUsd?: number;
  createdAt: string;
}

interface DashboardData {
  server: { status: string; size: string; ip: string } | null;
  connectors: { total: number; active: number; errors: number };
  skills: { installed: number; active: number };
}

export default function MonitoringPage() {
  const { get, loading } = useApi();
  const [usage, setUsage] = useState<Usage>({ totalInput: 0, totalOutput: 0, totalCost: 0, messageCount: 0 });
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState<"day" | "week" | "month">("month");

  useEffect(() => {
    get<{ usage: Usage }>(`/monitoring/usage?period=${period}`)
      .then((d) => setUsage(d.usage))
      .catch(() => {});

    get<{ metrics: Metrics }>("/servers/metrics")
      .then((d) => setMetrics(d.metrics))
      .catch(() => setMetrics(null));

    get<{ logs: LogEntry[] }>("/monitoring/logs?limit=20")
      .then((d) => setLogs(d.logs || []))
      .catch(() => {});

    get<DashboardData>("/monitoring/dashboard")
      .then((d) => setDashboard(d))
      .catch(() => {});
  }, [period]);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}j ${h}h ${m}m`;
  };

  const formatTokens = (n: number) => {
    if (n > 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n > 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div className="h-screen overflow-y-auto">
      <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Monitoring</h1>
          <div className="flex gap-1 bg-srank-card border border-srank-border rounded-lg p-0.5">
            {(["day", "week", "month"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${period === p ? "bg-srank-primary text-white" : "text-srank-text-muted hover:text-srank-text-primary"}`}>
                {p === "day" ? "24h" : p === "week" ? "7j" : "30j"}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Tokens utilis\u00E9s" value={formatTokens(usage.totalInput + usage.totalOutput)} color="cyan" sub={`${usage.messageCount} messages`} />
          <StatCard label="Co\u00FBt API" value={`$${usage.totalCost.toFixed(2)}`} color="amber" sub={`Input: ${formatTokens(usage.totalInput)}`} />
          <StatCard label="Connecteurs" value={dashboard?.connectors.active.toString() || "0"} color="green" sub={`${dashboard?.connectors.errors || 0} erreurs`} />
          <StatCard label="Skills" value={dashboard?.skills.installed.toString() || "0"} color="primary" sub={`${dashboard?.skills.active || 0} actifs`} />
        </div>

        {/* Server Resources */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-srank-card border border-srank-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Ressources Serveur</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${dashboard?.server?.status === "running" ? "bg-srank-green/10 text-srank-green" : "bg-srank-red/10 text-srank-red"}`}>
                {dashboard?.server?.status || "off"}
              </span>
            </div>

            {metrics ? (
              <>
                <ResourceBar label="CPU" value={metrics.cpuPercent} color="cyan" />
                <ResourceBar label="RAM" value={Math.round((metrics.ramUsedMb / metrics.ramTotalMb) * 100)} unit="%" color="primary" />
                <ResourceBar label="Disque" value={Math.round((metrics.diskUsedGb / metrics.diskTotalGb) * 100)} unit="%" color="green" />
                <div className="mt-3 flex items-center justify-between text-[10px] text-srank-text-muted">
                  <span>Uptime: {formatUptime(metrics.uptimeSeconds)}</span>
                  <span>{dashboard?.server?.ip || ""}</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-srank-text-muted text-center py-8">Serveur non disponible</p>
            )}
          </div>

          {/* Cost breakdown */}
          <div className="p-5 rounded-xl bg-srank-card border border-srank-border">
            <h2 className="text-sm font-semibold mb-4">D\u00E9tail des co\u00FBts</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-srank-text-muted">Tokens Input</span>
                <span className="text-xs font-mono">{formatTokens(usage.totalInput)} \u2192 ${((usage.totalInput / 1_000_000) * 3).toFixed(3)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-srank-text-muted">Tokens Output</span>
                <span className="text-xs font-mono">{formatTokens(usage.totalOutput)} \u2192 ${((usage.totalOutput / 1_000_000) * 15).toFixed(3)}</span>
              </div>
              <div className="border-t border-srank-border pt-3 flex justify-between items-center">
                <span className="text-xs font-semibold">Total</span>
                <span className="text-sm font-bold text-srank-amber">${usage.totalCost.toFixed(2)}</span>
              </div>
              <p className="text-[10px] text-srank-text-muted mt-2">
                Tarif Sonnet 4 : $3/M input, $15/M output. Factur\u00E9 directement par Anthropic via votre cl\u00E9 API.
              </p>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <ActivityLog logs={logs} maxItems={20} />
      </div>
    </div>
  );
}
