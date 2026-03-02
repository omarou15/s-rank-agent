"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle, Zap, Brain, Calendar, TrendingUp,
  Heart, Star, Sparkles, ChevronRight, Edit3, Check
} from "lucide-react";

// ── XP & Evolution System ──
interface AgentState {
  name: string;
  xp: number;
  createdAt: number;
  streak: number;
  lastActiveDate: string;
  totalTasks: number;
  totalSkills: number;
  totalConnectors: number;
  totalCrons: number;
}

const STAGES = [
  { name: "Bébé", minXp: 0, maxXp: 100, emoji: "👶", age: "Nouveau-né", color: "#f0abfc", bgGlow: "from-pink-500/20 via-purple-500/10", phrase: "Je viens de naître ! Apprends-moi des choses..." },
  { name: "Toddler", minXp: 100, maxXp: 500, emoji: "🧒", age: "Tout-petit", color: "#93c5fd", bgGlow: "from-blue-500/20 via-cyan-500/10", phrase: "Je commence à comprendre le monde !" },
  { name: "Enfant", minXp: 500, maxXp: 1500, emoji: "🤖", age: "Enfant", color: "#6ee7b7", bgGlow: "from-emerald-500/20 via-teal-500/10", phrase: "Je sais faire plein de trucs ! Donne-moi des missions !" },
  { name: "Ado", minXp: 1500, maxXp: 4000, emoji: "😎", age: "Adolescent", color: "#fbbf24", bgGlow: "from-amber-500/20 via-orange-500/10", phrase: "Easy. Je gère, t'inquiète." },
  { name: "Adulte", minXp: 4000, maxXp: 10000, emoji: "🎯", age: "Adulte", color: "#a78bfa", bgGlow: "from-violet-500/20 via-indigo-500/10", phrase: "Mission accomplie. Toujours." },
  { name: "Senior", minXp: 10000, maxXp: 99999, emoji: "👑", age: "Maître", color: "#fcd34d", bgGlow: "from-yellow-500/20 via-amber-500/10", phrase: "La sagesse vient avec l'expérience." },
];

function getStage(xp: number) {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (xp >= STAGES[i].minXp) return { ...STAGES[i], index: i };
  }
  return { ...STAGES[0], index: 0 };
}

function getDaysSince(ts: number): number {
  return Math.max(1, Math.floor((Date.now() - ts) / 86400000) + 1);
}

// ── Robot SVG Components ──
function BabyRobot({ color, pulse }: { color: string; pulse: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className={`w-full h-full ${pulse ? "animate-bounce" : ""}`} style={{ animationDuration: "3s" }}>
      {/* Body */}
      <rect x="65" y="90" width="70" height="60" rx="20" fill={color} opacity="0.2" stroke={color} strokeWidth="2" />
      {/* Head */}
      <circle cx="100" cy="65" r="35" fill={color} opacity="0.15" stroke={color} strokeWidth="2" />
      {/* Eyes - big curious */}
      <circle cx="85" cy="60" r="10" fill="#1a1a2e" />
      <circle cx="115" cy="60" r="10" fill="#1a1a2e" />
      <circle cx="88" cy="57" r="4" fill="white" />
      <circle cx="118" cy="57" r="4" fill="white" />
      {/* Mouth - smile */}
      <path d="M 88 75 Q 100 85 112 75" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Antenna */}
      <line x1="100" y1="30" x2="100" y2="15" stroke={color} strokeWidth="2" />
      <circle cx="100" cy="12" r="4" fill={color}>
        <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Arms - tiny */}
      <line x1="65" y1="110" x2="50" y2="120" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <line x1="135" y1="110" x2="150" y2="120" stroke={color} strokeWidth="3" strokeLinecap="round" />
      {/* Pacifier */}
      <circle cx="100" cy="80" r="5" fill={color} opacity="0.4" />
    </svg>
  );
}

function ToddlerRobot({ color, pulse }: { color: string; pulse: boolean }) {
  return (
    <svg viewBox="0 0 200 220" className={`w-full h-full ${pulse ? "animate-bounce" : ""}`} style={{ animationDuration: "2.5s" }}>
      <rect x="60" y="95" width="80" height="65" rx="15" fill={color} opacity="0.2" stroke={color} strokeWidth="2" />
      <circle cx="100" cy="60" r="38" fill={color} opacity="0.15" stroke={color} strokeWidth="2" />
      {/* Eyes */}
      <circle cx="84" cy="55" r="9" fill="#1a1a2e" />
      <circle cx="116" cy="55" r="9" fill="#1a1a2e" />
      <circle cx="87" cy="53" r="3.5" fill="white" />
      <circle cx="119" cy="53" r="3.5" fill="white" />
      {/* Happy mouth */}
      <path d="M 85 72 Q 100 82 115 72" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Antenna */}
      <line x1="100" y1="22" x2="100" y2="8" stroke={color} strokeWidth="2" />
      <circle cx="100" cy="6" r="5" fill={color}>
        <animate attributeName="r" values="5;7;5" dur="1.5s" repeatCount="indefinite" />
      </circle>
      {/* Arms - waving */}
      <line x1="60" y1="115" x2="38" y2="100" stroke={color} strokeWidth="3" strokeLinecap="round">
        <animate attributeName="y2" values="100;90;100" dur="1.5s" repeatCount="indefinite" />
      </line>
      <line x1="140" y1="115" x2="162" y2="100" stroke={color} strokeWidth="3" strokeLinecap="round">
        <animate attributeName="y2" values="100;90;100" dur="1.5s" repeatCount="indefinite" />
      </line>
      {/* Legs */}
      <line x1="80" y1="160" x2="75" y2="190" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <line x1="120" y1="160" x2="125" y2="190" stroke={color} strokeWidth="3" strokeLinecap="round" />
      {/* Star badge */}
      <text x="100" y="135" textAnchor="middle" fontSize="16">⭐</text>
    </svg>
  );
}

function ChildRobot({ color, pulse }: { color: string; pulse: boolean }) {
  return (
    <svg viewBox="0 0 200 240" className="w-full h-full">
      <rect x="55" y="95" width="90" height="75" rx="12" fill={color} opacity="0.2" stroke={color} strokeWidth="2" />
      <rect x="52" y="90" width="96" height="10" rx="5" fill={color} opacity="0.3" />
      <circle cx="100" cy="55" r="40" fill={color} opacity="0.15" stroke={color} strokeWidth="2" />
      <circle cx="82" cy="50" r="8" fill="#1a1a2e" />
      <circle cx="118" cy="50" r="8" fill="#1a1a2e" />
      <circle cx="85" cy="48" r="3" fill="white" />
      <circle cx="121" cy="48" r="3" fill="white" />
      <path d="M 82 68 Q 100 80 118 68" fill={color} opacity="0.3" stroke={color} strokeWidth="2" />
      <line x1="100" y1="15" x2="100" y2="2" stroke={color} strokeWidth="2.5" />
      <polygon points="100,0 94,8 106,8" fill={color}>
        <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite" />
      </polygon>
      {/* Strong arms */}
      <line x1="55" y1="120" x2="30" y2="105" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <circle cx="28" cy="103" r="5" fill={color} opacity="0.3" />
      <line x1="145" y1="120" x2="170" y2="105" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <circle cx="172" cy="103" r="5" fill={color} opacity="0.3" />
      {/* Legs */}
      <rect x="72" y="170" width="14" height="30" rx="5" fill={color} opacity="0.2" stroke={color} strokeWidth="1.5" />
      <rect x="114" y="170" width="14" height="30" rx="5" fill={color} opacity="0.2" stroke={color} strokeWidth="1.5" />
      {/* Chest emblem */}
      <text x="100" y="140" textAnchor="middle" fontSize="20">🛡️</text>
    </svg>
  );
}

function TeenRobot({ color, pulse }: { color: string; pulse: boolean }) {
  return (
    <svg viewBox="0 0 200 260" className="w-full h-full">
      <rect x="50" y="95" width="100" height="85" rx="10" fill={color} opacity="0.2" stroke={color} strokeWidth="2" />
      {/* Hoodie collar */}
      <path d="M 60 95 Q 100 110 140 95" fill={color} opacity="0.15" />
      <circle cx="100" cy="52" r="42" fill={color} opacity="0.15" stroke={color} strokeWidth="2" />
      {/* Sunglasses */}
      <rect x="68" y="42" width="24" height="14" rx="3" fill="#1a1a2e" />
      <rect x="108" y="42" width="24" height="14" rx="3" fill="#1a1a2e" />
      <line x1="92" y1="49" x2="108" y2="49" stroke="#1a1a2e" strokeWidth="2" />
      <rect x="73" y="46" width="14" height="6" rx="2" fill={color} opacity="0.4" />
      <rect x="113" y="46" width="14" height="6" rx="2" fill={color} opacity="0.4" />
      {/* Smirk */}
      <path d="M 90 70 Q 105 77 118 68" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Antenna - styled */}
      <line x1="100" y1="10" x2="100" y2="0" stroke={color} strokeWidth="3" />
      <circle cx="100" cy="-2" r="6" fill={color}>
        <animate attributeName="fill-opacity" values="1;0.3;1" dur="0.8s" repeatCount="indefinite" />
      </circle>
      {/* Arms crossed? */}
      <line x1="50" y1="130" x2="25" y2="140" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <line x1="150" y1="130" x2="175" y2="140" stroke={color} strokeWidth="4" strokeLinecap="round" />
      {/* Legs */}
      <rect x="68" y="180" width="16" height="40" rx="6" fill={color} opacity="0.2" stroke={color} strokeWidth="1.5" />
      <rect x="116" y="180" width="16" height="40" rx="6" fill={color} opacity="0.2" stroke={color} strokeWidth="1.5" />
      {/* Sneakers */}
      <rect x="64" y="218" width="24" height="10" rx="5" fill={color} opacity="0.4" />
      <rect x="112" y="218" width="24" height="10" rx="5" fill={color} opacity="0.4" />
      <text x="100" y="148" textAnchor="middle" fontSize="20">⚡</text>
    </svg>
  );
}

function AdultRobot({ color, pulse }: { color: string; pulse: boolean }) {
  return (
    <svg viewBox="0 0 200 270" className="w-full h-full">
      {/* Suit body */}
      <rect x="45" y="100" width="110" height="90" rx="8" fill={color} opacity="0.2" stroke={color} strokeWidth="2" />
      {/* Tie */}
      <polygon points="100,105 95,120 100,140 105,120" fill={color} opacity="0.5" />
      {/* Head */}
      <circle cx="100" cy="52" r="44" fill={color} opacity="0.15" stroke={color} strokeWidth="2" />
      {/* Eyes - focused */}
      <rect x="76" y="42" width="16" height="10" rx="3" fill="#1a1a2e" />
      <rect x="108" y="42" width="16" height="10" rx="3" fill="#1a1a2e" />
      <circle cx="84" cy="47" r="3" fill={color} opacity="0.8">
        <animate attributeName="cx" values="82;86;82" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="116" cy="47" r="3" fill={color} opacity="0.8">
        <animate attributeName="cx" values="114;118;114" dur="3s" repeatCount="indefinite" />
      </circle>
      {/* Confident smile */}
      <path d="M 85 68 Q 100 76 115 68" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Crown antenna */}
      <polygon points="90,8 95,0 100,6 105,0 110,8" fill={color} opacity="0.6" stroke={color} strokeWidth="1" />
      {/* Strong arms */}
      <rect x="20" y="115" width="25" height="10" rx="5" fill={color} opacity="0.2" stroke={color} strokeWidth="1.5" />
      <rect x="155" y="115" width="25" height="10" rx="5" fill={color} opacity="0.2" stroke={color} strokeWidth="1.5" />
      {/* Briefcase */}
      <rect x="160" y="130" width="20" height="16" rx="3" fill={color} opacity="0.3" stroke={color} strokeWidth="1.5" />
      {/* Legs */}
      <rect x="65" y="190" width="18" height="45" rx="6" fill={color} opacity="0.2" stroke={color} strokeWidth="1.5" />
      <rect x="117" y="190" width="18" height="45" rx="6" fill={color} opacity="0.2" stroke={color} strokeWidth="1.5" />
      {/* Shoes */}
      <rect x="60" y="232" width="28" height="10" rx="5" fill={color} opacity="0.4" />
      <rect x="112" y="232" width="28" height="10" rx="5" fill={color} opacity="0.4" />
      <text x="100" y="155" textAnchor="middle" fontSize="18">🎯</text>
    </svg>
  );
}

function SeniorRobot({ color, pulse }: { color: string; pulse: boolean }) {
  return (
    <svg viewBox="0 0 200 270" className="w-full h-full">
      {/* Robe body */}
      <path d="M 45 105 L 40 200 Q 100 210 160 200 L 155 105 Z" fill={color} opacity="0.15" stroke={color} strokeWidth="2" />
      {/* Head */}
      <circle cx="100" cy="52" r="46" fill={color} opacity="0.1" stroke={color} strokeWidth="2.5" />
      {/* Wise eyes */}
      <ellipse cx="82" cy="48" rx="10" ry="7" fill="#1a1a2e" />
      <ellipse cx="118" cy="48" rx="10" ry="7" fill="#1a1a2e" />
      <circle cx="82" cy="48" r="4" fill={color} opacity="0.9">
        <animate attributeName="opacity" values="0.9;0.4;0.9" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="118" cy="48" r="4" fill={color} opacity="0.9">
        <animate attributeName="opacity" values="0.9;0.4;0.9" dur="4s" repeatCount="indefinite" />
      </circle>
      {/* Beard */}
      <path d="M 80 70 Q 90 90 100 92 Q 110 90 120 70" fill={color} opacity="0.1" stroke={color} strokeWidth="1.5" />
      {/* Crown */}
      <polygon points="75,8 82,0 90,6 100,-2 110,6 118,0 125,8" fill={color} opacity="0.7" stroke={color} strokeWidth="1.5">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
      </polygon>
      {/* Staff */}
      <line x1="165" y1="100" x2="175" y2="220" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx="165" cy="96" r="8" fill={color} opacity="0.3" stroke={color} strokeWidth="1.5">
        <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Medals */}
      <circle cx="80" cy="130" r="6" fill={color} opacity="0.5" />
      <circle cx="100" cy="125" r="7" fill={color} opacity="0.6" />
      <circle cx="120" cy="130" r="6" fill={color} opacity="0.5" />
      {/* Legs hidden in robe */}
      <rect x="70" y="200" width="14" height="30" rx="5" fill={color} opacity="0.15" />
      <rect x="116" y="200" width="14" height="30" rx="5" fill={color} opacity="0.15" />
      <text x="100" y="165" textAnchor="middle" fontSize="20">👑</text>
    </svg>
  );
}

const ROBOT_COMPONENTS = [BabyRobot, ToddlerRobot, ChildRobot, TeenRobot, AdultRobot, SeniorRobot];

// ── Main Page ──
export default function AgentHomePage() {
  const router = useRouter();
  const [agent, setAgent] = useState<AgentState | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showLevelUp, setShowLevelUp] = useState(false);

  // Load agent state
  useEffect(() => {
    const saved = localStorage.getItem("s-rank-agent");
    if (saved) {
      const data = JSON.parse(saved);
      setAgent(data);
      // Check streak
      const today = new Date().toISOString().slice(0, 10);
      if (data.lastActiveDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const newStreak = data.lastActiveDate === yesterday ? data.streak + 1 : 1;
        const streakXP = newStreak > 1 ? 25 : 0;
        const updated = { ...data, lastActiveDate: today, streak: newStreak, xp: data.xp + streakXP };
        setAgent(updated);
        localStorage.setItem("s-rank-agent", JSON.stringify(updated));
      }
    } else {
      // First time - create agent
      const newAgent: AgentState = {
        name: "S-Rank",
        xp: 0,
        createdAt: Date.now(),
        streak: 1,
        lastActiveDate: new Date().toISOString().slice(0, 10),
        totalTasks: 0,
        totalSkills: 0,
        totalConnectors: 0,
        totalCrons: 0,
      };
      setAgent(newAgent);
      localStorage.setItem("s-rank-agent", JSON.stringify(newAgent));
    }

    // Listen for XP gains from other pages
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "s-rank-xp-event" && e.newValue) {
        try {
          const { amount, reason } = JSON.parse(e.newValue);
          setAgent(prev => {
            if (!prev) return prev;
            const prevStage = getStage(prev.xp);
            const updated = { ...prev, xp: prev.xp + amount };
            const newStage = getStage(updated.xp);
            if (newStage.index > prevStage.index) setShowLevelUp(true);
            localStorage.setItem("s-rank-agent", JSON.stringify(updated));
            return updated;
          });
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    // Compute XP from existing data
    computeXP();

    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const computeXP = () => {
    try {
      const tasks = JSON.parse(localStorage.getItem("s-rank-tasks") || "[]");
      const skills = JSON.parse(localStorage.getItem("s-rank-installed-skills") || "[]");
      const connectors = JSON.parse(localStorage.getItem("s-rank-active-connectors") || "[]");
      const stats = JSON.parse(localStorage.getItem("s-rank-stats") || "[]");

      const taskXP = tasks.length * 10;
      const skillXP = skills.length * 50;
      const connXP = connectors.length * 30;
      const totalDays = stats.length;
      const streakXP = totalDays * 5;

      const totalXP = taskXP + skillXP + connXP + streakXP;

      setAgent(prev => {
        if (!prev) return prev;
        const updated = { ...prev, xp: Math.max(prev.xp, totalXP), totalTasks: tasks.length, totalSkills: skills.length, totalConnectors: connectors.length };
        localStorage.setItem("s-rank-agent", JSON.stringify(updated));
        return updated;
      });
    } catch {}
  };

  const saveName = () => {
    if (!nameInput.trim() || !agent) return;
    const updated = { ...agent, name: nameInput.trim() };
    setAgent(updated);
    localStorage.setItem("s-rank-agent", JSON.stringify(updated));
    setEditingName(false);
  };

  if (!agent) return null;

  const stage = getStage(agent.xp);
  const RobotComponent = ROBOT_COMPONENTS[stage.index];
  const days = getDaysSince(agent.createdAt);
  const xpInStage = agent.xp - stage.minXp;
  const xpNeeded = stage.maxXp - stage.minXp;
  const progress = Math.min((xpInStage / xpNeeded) * 100, 100);
  const nextStage = stage.index < STAGES.length - 1 ? STAGES[stage.index + 1] : null;

  return (
    <div className="h-full overflow-y-auto bg-zinc-950">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">

        {/* Level up celebration */}
        {showLevelUp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowLevelUp(false)}>
            <div className="bg-zinc-900 rounded-3xl p-8 border border-violet-500/50 text-center max-w-xs animate-bounce" style={{ animationDuration: "1s", animationIterationCount: "3" }}>
              <p className="text-4xl mb-3">{stage.emoji}</p>
              <p className="text-xl font-bold text-white mb-1">Évolution !</p>
              <p className="text-sm text-violet-400">{agent.name} est maintenant <strong>{stage.name}</strong></p>
              <p className="text-xs text-zinc-500 mt-2">Tap pour continuer</p>
            </div>
          </div>
        )}

        {/* Agent card */}
        <div className={`relative rounded-3xl border border-zinc-800 overflow-hidden bg-gradient-to-b ${stage.bgGlow} to-zinc-950`}>
          {/* Glow effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-[80px] opacity-30" style={{ backgroundColor: stage.color }} />

          <div className="relative pt-6 pb-4 px-6">
            {/* Age badge */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-1.5 bg-zinc-900/80 backdrop-blur rounded-full px-3 py-1">
                <Calendar size={11} className="text-zinc-400" />
                <span className="text-[10px] text-zinc-400">Jour {days}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-zinc-900/80 backdrop-blur rounded-full px-3 py-1">
                <Heart size={11} className="text-red-400" />
                <span className="text-[10px] text-zinc-400">{agent.streak}j streak</span>
              </div>
            </div>

            {/* Robot */}
            <div className="w-40 h-40 mx-auto mb-3">
              <RobotComponent color={stage.color} pulse={true} />
            </div>

            {/* Name */}
            <div className="text-center mb-1">
              {editingName ? (
                <div className="flex items-center justify-center gap-2">
                  <input value={nameInput} onChange={e => setNameInput(e.target.value)} autoFocus
                    onKeyDown={e => e.key === "Enter" && saveName()}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white text-center w-36 focus:outline-none focus:border-violet-500" />
                  <button onClick={saveName} className="p-1.5 bg-violet-600 rounded-lg"><Check size={14} className="text-white" /></button>
                </div>
              ) : (
                <button onClick={() => { setEditingName(true); setNameInput(agent.name); }} className="group inline-flex items-center gap-1.5">
                  <span className="text-xl font-bold text-white">{agent.name}</span>
                  <Edit3 size={12} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </button>
              )}
            </div>

            {/* Stage & XP */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ backgroundColor: stage.color + "20" }}>
                <span className="text-sm">{stage.emoji}</span>
                <span className="text-xs font-semibold" style={{ color: stage.color }}>{stage.name}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1.5 italic">&quot;{stage.phrase}&quot;</p>
            </div>

            {/* XP Bar */}
            <div className="mb-2">
              <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                <span>{agent.xp} XP</span>
                {nextStage && <span>{nextStage.name} → {stage.maxXp} XP</span>}
              </div>
              <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%`, backgroundColor: stage.color }} />
              </div>
            </div>
          </div>
        </div>

        {/* Chat CTA */}
        <button onClick={() => router.push("/chat")}
          className="w-full flex items-center justify-between p-4 rounded-2xl border border-violet-500/30 bg-violet-600/10 hover:bg-violet-600/20 transition-colors group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
              <MessageCircle size={20} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Parler à {agent.name}</p>
              <p className="text-[10px] text-zinc-500">Demande, il exécute.</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-violet-400 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-amber-400" />
              <span className="text-[10px] text-zinc-500 uppercase">Tâches</span>
            </div>
            <p className="text-2xl font-bold text-white">{agent.totalTasks}</p>
            <p className="text-[10px] text-zinc-600">+10 XP chacune</p>
          </div>
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Brain size={14} className="text-violet-400" />
              <span className="text-[10px] text-zinc-500 uppercase">Skills</span>
            </div>
            <p className="text-2xl font-bold text-white">{agent.totalSkills}</p>
            <p className="text-[10px] text-zinc-600">+50 XP chacun</p>
          </div>
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-cyan-400" />
              <span className="text-[10px] text-zinc-500 uppercase">Connecteurs</span>
            </div>
            <p className="text-2xl font-bold text-white">{agent.totalConnectors}</p>
            <p className="text-[10px] text-zinc-600">+30 XP chacun</p>
          </div>
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-emerald-400" />
              <span className="text-[10px] text-zinc-500 uppercase">Streak</span>
            </div>
            <p className="text-2xl font-bold text-white">{agent.streak}j</p>
            <p className="text-[10px] text-zinc-600">+25 XP/jour</p>
          </div>
        </div>

        {/* Evolution roadmap */}
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
          <p className="text-xs font-semibold text-white mb-3">Évolution</p>
          <div className="space-y-2">
            {STAGES.map((s, i) => {
              const reached = agent.xp >= s.minXp;
              const current = stage.index === i;
              return (
                <div key={i} className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${current ? "bg-zinc-800" : ""}`}>
                  <span className={`text-lg ${reached ? "" : "grayscale opacity-30"}`}>{s.emoji}</span>
                  <div className="flex-1">
                    <p className={`text-xs font-medium ${reached ? "text-white" : "text-zinc-600"}`}>{s.name}</p>
                    <p className="text-[9px] text-zinc-600">{s.minXp} XP</p>
                  </div>
                  {current && <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400">Actuel</span>}
                  {reached && !current && <Star size={12} className="text-amber-400" />}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
