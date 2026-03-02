"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Menu, X, MessageSquare, Terminal, FolderOpen, Plug, Puzzle, Activity, Settings, CreditCard, Bot } from "lucide-react";
import { PaywallGate } from "./paywall-gate";

const NAV_ITEMS = [
  { href: "/agent", icon: Bot, label: "Agent" },
  { href: "/chat", icon: MessageSquare, label: "Chat" },
  { href: "/terminal", icon: Terminal, label: "Terminal" },
  { href: "/files", icon: FolderOpen, label: "Fichiers" },
  { href: "/connectors", icon: Plug, label: "Connecteurs" },
  { href: "/skills", icon: Puzzle, label: "Skills" },
  { href: "/monitoring", icon: Activity, label: "Monitoring" },
  { href: "/settings", icon: Settings, label: "Paramètres" },
  { href: "/settings/billing", icon: CreditCard, label: "Abonnement" },
];

export function ResponsiveShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [agentWorking, setAgentWorking] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    const check = () => setAgentWorking(localStorage.getItem("s-rank-agent-working") === "true");
    check();
    const handler = (e: StorageEvent) => { if (e.key === "s-rank-agent-working") check(); };
    window.addEventListener("storage", handler);
    const interval = setInterval(check, 1000);
    return () => { window.removeEventListener("storage", handler); clearInterval(interval); };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSidebarOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ background: "linear-gradient(145deg, #0a0a12 0%, #000000 50%, #060612 100%)" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — Glass */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] flex flex-col transform transition-transform duration-300 ease-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{
          background: "rgba(15, 15, 20, 0.75)",
          backdropFilter: "blur(50px) saturate(200%)",
          WebkitBackdropFilter: "blur(50px) saturate(200%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}>

        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-5">
          <Link href="/chat" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0A84FF, #5E5CE6)", boxShadow: "0 4px 16px rgba(10,132,255,0.3)" }}>
              <span className="text-[13px] font-bold text-white">S</span>
            </div>
            <div>
              <span className="text-[14px] font-semibold text-white/90 tracking-tight block leading-none">S-Rank</span>
              <span className="text-[10px] text-white/30 font-medium tracking-wider">AGENT</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/40 hover:text-white/80 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && item.href !== "/settings" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-[9px] rounded-xl text-[13px] font-medium transition-all duration-200 ${
                  isActive
                    ? "text-white"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                }`}
                style={isActive ? {
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
                } : undefined}>
                <Icon size={16} strokeWidth={isActive ? 2 : 1.5} className={isActive ? "text-[#0A84FF]" : ""} />
                <span>{item.label}</span>
                {item.href === "/chat" && agentWorking && (
                  <span className="ml-auto w-2 h-2 rounded-full animate-pulse" style={{ background: "#30D158", boxShadow: "0 0 8px rgba(48,209,88,0.5)" }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-white/60 truncate">Mon compte</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 h-12 px-4"
          style={{
            background: "rgba(10,10,15,0.8)",
            backdropFilter: "blur(30px)",
            WebkitBackdropFilter: "blur(30px)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}>
          <button onClick={() => setSidebarOpen(true)} className="text-white/40 hover:text-white/80 transition-colors">
            <Menu size={20} />
          </button>
          <span className="text-[13px] font-medium text-white/60">
            {NAV_ITEMS.find((n) => pathname.startsWith(n.href))?.label || "S-Rank"}
          </span>
        </div>

        <main className="flex-1 overflow-hidden"><PaywallGate>{children}</PaywallGate></main>
      </div>
    </div>
  );
}
