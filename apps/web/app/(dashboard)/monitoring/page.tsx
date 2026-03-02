"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity, Clock, CheckCircle, XCircle, Loader2, Pause, Play, Trash2,
  TrendingUp, TrendingDown, Zap, Calendar, BarChart3, Bot, RefreshCw,
  Plus, Power, Timer
} from "lucide-react";

// ── Types ──
interface Task {
  id: string;
  name: string;
  status: "running" | "done" | "error" | "paused";
  startedAt: number;
  finishedAt?: number;
  duration?: number;
  output?: string;
  error?: string;
}

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  description: string;
  command: string;
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
  lastStatus?: "success" | "error";
}

interface DayStat {
  date: string;
  tasks: number;
  success: number;
  errors: number;
  tokens: number;
}

// ── Helpers ──
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)}min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)}h`;
  return `il y a ${Math.floor(s / 86400)}j`;
}

function parseCron(schedule: string): string {
  const map: Record<string, string> = {
    "*/5 * * * *": "Toutes les 5 min",
    "*/15 * * * *": "Toutes les 15 min",
    "*/30 * * * *": "Toutes les 30 min",
    "0 * * * *": "Toutes les heures",
    "0 */6 * * *": "Toutes les 6h",
    "0 9 * * *": "Chaque jour à 9h",
    "0 9 * * 1-5": "Lun-Ven à 9h",
    "0 0 * * *": "Chaque jour à minuit",
    "0 0 * * 1": "Chaque lundi",
    "0 0 1 * *": "Le 1er du mois",
  };
  return map[schedule] || schedule;
}

// ── Mini bar chart component ──
function MiniChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px] h-10">
      {data.map((v, i) => (
        <div key={i} className={`w-[6px] rounded-t ${color} transition-all`}
          style={{ height: `${Math.max((v / max) * 100, 4)}%`, opacity: i === data.length - 1 ? 1 : 0.4 + (i / data.length) * 0.6 }} />
      ))}
    </div>
  );
}

// ── Task Row ──
function TaskRow({ task, onPause, onResume, onDelete }: { task: Task; onPause: () => void; onResume: () => void; onDelete: () => void }) {
  const elapsed = task.status === "running" ? Date.now() - task.startedAt : (task.duration || 0);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (task.status !== "running") return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [task.status]);

  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-900 rounded-xl border border-zinc-800">
      <div className="shrink-0">
        {task.status === "running" ? <Loader2 size={16} className="text-violet-400 animate-spin" /> :
         task.status === "done" ? <CheckCircle size={16} className="text-emerald-400" /> :
         task.status === "paused" ? <Pause size={16} className="text-amber-400" /> :
         <XCircle size={16} className="text-red-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{task.name}</p>
        <p className="text-[10px] text-zinc-500">
          {task.status === "running" ? formatDuration(elapsed) :
           task.status === "done" ? `Terminé — ${formatDuration(elapsed)}` :
           task.status === "paused" ? "En pause" :
           `Erreur — ${task.error?.slice(0, 40) || "inconnu"}`}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {task.status === "running" && (
          <button onClick={onPause} className="p-1.5 text-zinc-500 hover:text-amber-400 rounded-lg hover:bg-zinc-800">
            <Pause size={14} />
          </button>
        )}
        {task.status === "paused" && (
          <button onClick={onResume} className="p-1.5 text-zinc-500 hover:text-emerald-400 rounded-lg hover:bg-zinc-800">
            <Play size={14} />
          </button>
        )}
        {task.status !== "running" && (
          <button onClick={onDelete} className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Cron Row ──
function CronRow({ job, onToggle, onRunNow, onDelete }: { job: CronJob; onToggle: () => void; onRunNow: () => void; onDelete: () => void }) {
  const [running, setRunning] = useState(false);
  const handleRun = async () => { setRunning(true); await onRunNow(); setRunning(false); };
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${job.enabled ? "bg-zinc-900 border-zinc-800" : "bg-zinc-950 border-zinc-900 opacity-50"}`}>
      <Timer size={16} className={job.enabled ? "text-cyan-400" : "text-zinc-600"} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{job.name}</p>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          <span>{parseCron(job.schedule)}</span>
          {job.lastRun && <span>· Dernier: {timeAgo(job.lastRun)}</span>}
          {job.lastStatus && (
            <span className={job.lastStatus === "success" ? "text-emerald-400" : "text-red-400"}>
              {job.lastStatus === "success" ? "✓" : "✗"}
            </span>
          )}
        </div>
        {job.command && <p className="text-[9px] text-zinc-600 mt-0.5 font-mono truncate">{job.command}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={handleRun} disabled={running} title="Exécuter maintenant"
          className="p-1.5 text-zinc-500 hover:text-cyan-400 rounded-lg hover:bg-zinc-800 disabled:opacity-30">
          {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
        </button>
        <button onClick={onDelete} title="Supprimer"
          className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800">
          <Trash2 size={13} />
        </button>
        <button onClick={onToggle} className={`w-9 h-5 rounded-full transition-colors ${job.enabled ? "bg-emerald-500" : "bg-zinc-700"}`}>
          <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${job.enabled ? "translate-x-4.5 ml-[18px]" : "ml-[3px]"}`} />
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──
export default function CommandCenterPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [crons, setCrons] = useState<CronJob[]>([]);
  const [stats, setStats] = useState<DayStat[]>([]);
  const [metrics, setMetrics] = useState({ cpu: 0, ram: 0, storage: 0, uptime: 0 });
  const [tab, setTab] = useState<"tasks" | "crons" | "evolution">("tasks");
  const [showCronForm, setShowCronForm] = useState(false);
  const [cronForm, setCronForm] = useState({ name: "", command: "", schedule: "0 * * * *" });

  // Load data
  useEffect(() => {
    // Load tasks from localStorage
    try {
      const saved = localStorage.getItem("s-rank-tasks");
      if (saved) setTasks(JSON.parse(saved));
    } catch {}

    // Load crons from VPS
    fetch("/api/crons").then(r => r.json()).then(data => {
      if (Array.isArray(data) && data.length > 0) setCrons(data);
      else {
        // Seed default crons on VPS
        const defaults = getDefaultCrons();
        defaults.forEach(c => fetch("/api/crons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) }));
        setCrons(defaults);
      }
    }).catch(() => setCrons(getDefaultCrons()));

    // Load stats
    try {
      const saved = localStorage.getItem("s-rank-stats");
      if (saved) setStats(JSON.parse(saved));
      else setStats(generateMockStats());
    } catch { setStats(generateMockStats()); }

    // Fetch server metrics
    fetch("/api/server/metrics").then(r => r.json()).then(setMetrics).catch(() => {});

    // Listen for new tasks from chat
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "s-rank-task-event" && e.newValue) {
        try {
          const task = JSON.parse(e.newValue);
          setTasks(prev => {
            const existing = prev.findIndex(t => t.id === task.id);
            const updated = existing >= 0 ? prev.map(t => t.id === task.id ? task : t) : [...prev, task];
            localStorage.setItem("s-rank-tasks", JSON.stringify(updated.slice(-100)));
            return updated;
          });
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    // Poll running tasks + reload from localStorage
    const interval = setInterval(() => {
      try {
        const saved = JSON.parse(localStorage.getItem("s-rank-tasks") || "[]");
        setTasks(saved);
      } catch {}
    }, 3000);

    return () => { window.removeEventListener("storage", handleStorage); clearInterval(interval); };
  }, []);

  // Persist tasks
  useEffect(() => {
    if (tasks.length > 0) localStorage.setItem("s-rank-tasks", JSON.stringify(tasks.slice(-100)));
  }, [tasks]);

  const pauseTask = (id: string) => setTasks(prev => prev.map(t => t.id === id ? { ...t, status: "paused" as const } : t));
  const resumeTask = (id: string) => setTasks(prev => prev.map(t => t.id === id ? { ...t, status: "running" as const } : t));
  const deleteTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));
  const toggleCron = (id: string) => {
    setCrons(prev => {
      const cron = prev.find(c => c.id === id);
      if (!cron) return prev;
      const updated = prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c);
      // Update on VPS
      fetch(`/api/crons/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !cron.enabled }) }).catch(() => {});
      return updated;
    });
  };

  const runCronNow = async (id: string) => {
    try {
      const res = await fetch(`/api/crons/${id}/run`, { method: "POST" });
      const result = await res.json();
      setCrons(prev => prev.map(c => c.id === id ? { ...c, lastRun: Date.now(), lastStatus: result.status } : c));
    } catch {}
  };

  const createCron = async () => {
    const newCron: CronJob = {
      id: `cron-${Date.now()}`,
      name: cronForm.name,
      schedule: cronForm.schedule,
      description: cronForm.name,
      command: cronForm.command,
      enabled: true,
    };
    setCrons(prev => [...prev, newCron]);
    setShowCronForm(false);
    setCronForm({ name: "", command: "", schedule: "0 * * * *" });
    try { await fetch("/api/crons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newCron) }); } catch {}
  };

  const deleteCron = async (id: string) => {
    setCrons(prev => prev.filter(c => c.id !== id));
    try { await fetch(`/api/crons/${id}`, { method: "DELETE" }); } catch {}
  };

  // Computed
  const runningTasks = tasks.filter(t => t.status === "running");
  const recentTasks = tasks.filter(t => t.status !== "running").slice(-20).reverse();
  const totalToday = tasks.filter(t => new Date(t.startedAt).toDateString() === new Date().toDateString()).length;
  const successToday = tasks.filter(t => t.status === "done" && new Date(t.startedAt).toDateString() === new Date().toDateString()).length;
  const successRate = totalToday > 0 ? Math.round((successToday / totalToday) * 100) : 100;

  // Stats for evolution
  const last7 = stats.slice(-7);
  const thisWeekTasks = last7.reduce((s, d) => s + d.tasks, 0);
  const prevWeek = stats.slice(-14, -7);
  const prevWeekTasks = prevWeek.reduce((s, d) => s + d.tasks, 0);
  const weekChange = prevWeekTasks > 0 ? Math.round(((thisWeekTasks - prevWeekTasks) / prevWeekTasks) * 100) : 0;

  const thisWeekSuccess = last7.reduce((s, d) => s + d.success, 0);
  const thisWeekTotal = last7.reduce((s, d) => s + d.tasks, 0);
  const weekSuccessRate = thisWeekTotal > 0 ? Math.round((thisWeekSuccess / thisWeekTotal) * 100) : 100;

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Command Center</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Contrôle en temps réel de ton agent</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-zinc-900 rounded-lg px-2.5 py-1.5 border border-zinc-800">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-zinc-400">Agent actif</span>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
            <p className="text-[10px] text-zinc-500 uppercase">En cours</p>
            <p className="text-2xl font-bold text-white mt-1">{runningTasks.length}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{totalToday} aujourd&apos;hui</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
            <p className="text-[10px] text-zinc-500 uppercase">Taux succès</p>
            <p className={`text-2xl font-bold mt-1 ${successRate >= 80 ? "text-emerald-400" : successRate >= 50 ? "text-amber-400" : "text-red-400"}`}>{successRate}%</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">aujourd&apos;hui</p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
            <p className="text-[10px] text-zinc-500 uppercase">Semaine</p>
            <div className="flex items-center gap-1 mt-1">
              <p className="text-2xl font-bold text-white">{thisWeekTasks}</p>
              {weekChange !== 0 && (
                <span className={`text-[10px] flex items-center ${weekChange > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {weekChange > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {weekChange > 0 ? "+" : ""}{weekChange}%
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-600 mt-0.5">tâches</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 border border-zinc-800">
          {([
            { key: "tasks", label: "Tâches", icon: Activity },
            { key: "crons", label: "Crons", icon: Clock },
            { key: "evolution", label: "Évolution", icon: BarChart3 },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${tab === key ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
              <Icon size={13} />
              {label}
              {key === "tasks" && runningTasks.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-violet-500 text-[9px] text-white flex items-center justify-center">{runningTasks.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tasks Tab ── */}
        {tab === "tasks" && (
          <div className="space-y-4">
            {/* Running */}
            {runningTasks.length > 0 && (
              <div>
                <p className="text-[10px] text-zinc-500 uppercase mb-2">En cours ({runningTasks.length})</p>
                <div className="space-y-2">
                  {runningTasks.map(task => (
                    <TaskRow key={task.id} task={task} onPause={() => pauseTask(task.id)} onResume={() => resumeTask(task.id)} onDelete={() => deleteTask(task.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* Recent */}
            <div>
              <p className="text-[10px] text-zinc-500 uppercase mb-2">Récentes</p>
              {recentTasks.length === 0 ? (
                <div className="text-center py-8">
                  <Activity size={24} className="text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs text-zinc-600">Aucune tâche pour l&apos;instant</p>
                  <p className="text-[10px] text-zinc-700 mt-1">Les tâches exécutées par l&apos;agent apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTasks.map(task => (
                    <TaskRow key={task.id} task={task} onPause={() => pauseTask(task.id)} onResume={() => resumeTask(task.id)} onDelete={() => deleteTask(task.id)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Crons Tab ── */}
        {tab === "crons" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-zinc-500 uppercase">Tâches planifiées ({crons.filter(c => c.enabled).length} actives)</p>
              <button onClick={() => setShowCronForm(!showCronForm)} className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300">
                <Plus size={12} /> {showCronForm ? "Annuler" : "Ajouter"}
              </button>
            </div>

            {/* Create cron form */}
            {showCronForm && (
              <div className="bg-zinc-900 rounded-xl p-4 border border-violet-500/30 space-y-3">
                <input value={cronForm.name} onChange={e => setCronForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nom (ex: Scraping prix concurrents)"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500" />
                <input value={cronForm.command} onChange={e => setCronForm(f => ({ ...f, command: e.target.value }))}
                  placeholder="Commande (ex: python3 /home/agent/scripts/scrape.py)"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-violet-500" />
                <div>
                  <p className="text-[10px] text-zinc-500 mb-1.5">Fréquence</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: "5 min", value: "*/5 * * * *" },
                      { label: "15 min", value: "*/15 * * * *" },
                      { label: "1h", value: "0 * * * *" },
                      { label: "6h", value: "0 */6 * * *" },
                      { label: "Quotidien 9h", value: "0 9 * * *" },
                      { label: "Lun-Ven 9h", value: "0 9 * * 1-5" },
                    ].map(opt => (
                      <button key={opt.value} onClick={() => setCronForm(f => ({ ...f, schedule: opt.value }))}
                        className={`px-2 py-1.5 rounded-lg text-[10px] border transition-colors ${cronForm.schedule === opt.value ? "bg-violet-600 border-violet-500 text-white" : "bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-600"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={createCron} disabled={!cronForm.name || !cronForm.command}
                  className="w-full py-2 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed">
                  Créer le cron
                </button>
              </div>
            )}

            <div className="space-y-2">
              {crons.map(job => (
                <CronRow key={job.id} job={job} onToggle={() => toggleCron(job.id)} onRunNow={() => runCronNow(job.id)} onDelete={() => deleteCron(job.id)} />
              ))}
            </div>
            {crons.length === 0 && (
              <div className="text-center py-8">
                <Clock size={24} className="text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-600">Aucun cron configuré</p>
                <p className="text-[10px] text-zinc-700 mt-1">Demande à l&apos;agent : &quot;Lance un scraping toutes les heures&quot;</p>
              </div>
            )}
          </div>
        )}

        {/* ── Evolution Tab ── */}
        {tab === "evolution" && (
          <div className="space-y-4">
            {/* Performance card */}
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-white">Performance cette semaine</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${weekChange >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                  {weekChange >= 0 ? "+" : ""}{weekChange}% vs sem. dernière
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <p className="text-[10px] text-zinc-500">Tâches</p>
                  <p className="text-lg font-bold text-white">{thisWeekTasks}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500">Taux succès</p>
                  <p className={`text-lg font-bold ${weekSuccessRate >= 80 ? "text-emerald-400" : "text-amber-400"}`}>{weekSuccessRate}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500">Tokens</p>
                  <p className="text-lg font-bold text-white">{(last7.reduce((s, d) => s + d.tokens, 0) / 1000).toFixed(1)}k</p>
                </div>
              </div>
              {/* Chart */}
              <div className="flex items-end justify-between gap-1 h-20 px-1">
                {last7.map((d, i) => {
                  const max = Math.max(...last7.map(x => x.tasks), 1);
                  const successH = (d.success / max) * 100;
                  const errorH = (d.errors / max) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full flex flex-col items-center justify-end h-16 gap-[1px]">
                        {d.errors > 0 && <div className="w-full rounded-t bg-red-500/60" style={{ height: `${Math.max(errorH, 3)}%` }} />}
                        <div className="w-full rounded-t bg-violet-500" style={{ height: `${Math.max(successH, 3)}%` }} />
                      </div>
                      <span className="text-[8px] text-zinc-600">{new Date(d.date).toLocaleDateString("fr-FR", { weekday: "narrow" })}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-2 justify-center">
                <span className="flex items-center gap-1 text-[9px] text-zinc-500"><span className="w-2 h-2 rounded-sm bg-violet-500" /> Succès</span>
                <span className="flex items-center gap-1 text-[9px] text-zinc-500"><span className="w-2 h-2 rounded-sm bg-red-500/60" /> Erreurs</span>
              </div>
            </div>

            {/* 30 day trend */}
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <p className="text-xs font-semibold text-white mb-3">Tendance 30 jours</p>
              <div className="flex items-end justify-between gap-[2px] h-12">
                {stats.map((d, i) => {
                  const max = Math.max(...stats.map(x => x.tasks), 1);
                  return (
                    <div key={i} className="flex-1 rounded-t bg-violet-500 transition-all"
                      style={{ height: `${Math.max((d.tasks / max) * 100, 3)}%`, opacity: 0.3 + (i / stats.length) * 0.7 }} />
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[8px] text-zinc-600">{stats[0]?.date ? new Date(stats[0].date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : ""}</span>
                <span className="text-[8px] text-zinc-600">Aujourd&apos;hui</span>
              </div>
            </div>

            {/* Agent score */}
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <Bot size={16} className="text-violet-400" />
                <p className="text-xs font-semibold text-white">Score Agent</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-950 rounded-lg p-3">
                  <p className="text-[10px] text-zinc-500">Skills installés</p>
                  <p className="text-lg font-bold text-white">{(() => { try { return JSON.parse(localStorage.getItem("s-rank-installed-skills") || "[]").length; } catch { return 0; } })()}</p>
                </div>
                <div className="bg-zinc-950 rounded-lg p-3">
                  <p className="text-[10px] text-zinc-500">Connecteurs actifs</p>
                  <p className="text-lg font-bold text-white">{(() => { try { return JSON.parse(localStorage.getItem("s-rank-active-connectors") || "[]").length; } catch { return 0; } })()}</p>
                </div>
                <div className="bg-zinc-950 rounded-lg p-3">
                  <p className="text-[10px] text-zinc-500">Faits mémorisés</p>
                  <p className="text-lg font-bold text-white">{(() => { try { return JSON.parse(localStorage.getItem("s-rank-memory") || '{"facts":[]}').facts.length; } catch { return 0; } })()}</p>
                </div>
                <div className="bg-zinc-950 rounded-lg p-3">
                  <p className="text-[10px] text-zinc-500">Autonomie</p>
                  <p className="text-lg font-bold text-violet-400">Niv. {localStorage.getItem("s-rank-trust-level") || "2"}</p>
                </div>
              </div>
            </div>

            {/* Server */}
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <p className="text-xs font-semibold text-white mb-3">Serveur</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-zinc-500">CPU</p>
                  <div className="mt-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${metrics.cpu || 0}%` }} />
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{metrics.cpu || 0}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500">RAM</p>
                  <div className="mt-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${metrics.ram || 0}%` }} />
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{metrics.ram || 0}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500">Stockage</p>
                  <div className="mt-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${metrics.storage || 0}%` }} />
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{metrics.storage || 0}%</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Default crons ──
function getDefaultCrons(): CronJob[] {
  return [
    { id: "cron-1", name: "Backup serveur", schedule: "0 0 * * *", description: "Snapshot quotidien du serveur", command: "tar -czf /home/agent/backups/backup-$(date +%Y%m%d).tar.gz /home/agent/projects/ 2>/dev/null; ls -la /home/agent/backups/ | tail -5", enabled: true, lastRun: Date.now() - 43200000, lastStatus: "success" },
    { id: "cron-2", name: "Nettoyage fichiers temporaires", schedule: "0 */6 * * *", description: "Supprime les fichiers tmp > 24h", command: "find /tmp -type f -mmin +1440 -delete 2>/dev/null; echo Nettoyage OK; du -sh /tmp/", enabled: true, lastRun: Date.now() - 7200000, lastStatus: "success" },
    { id: "cron-3", name: "Rapport activite", schedule: "0 9 * * 1-5", description: "Resume actions de la veille", command: "echo Rapport $(date); uptime; df -h /", enabled: false },
  ];
}

// ── Mock stats (30 days) ──
function generateMockStats(): DayStat[] {
  const stats: DayStat[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const base = Math.floor(Math.random() * 8) + 2;
    const errors = Math.floor(Math.random() * Math.max(1, base * 0.2));
    stats.push({
      date: d.toISOString().slice(0, 10),
      tasks: base,
      success: base - errors,
      errors,
      tokens: (base * 1200) + Math.floor(Math.random() * 3000),
    });
  }
  return stats;
}
