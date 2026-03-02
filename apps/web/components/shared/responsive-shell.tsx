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
    <div className="flex h-[100dvh] bg-[#0a0a0a] overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] bg-[#111111] flex flex-col transform transition-transform duration-300 ease-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>

        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-5">
          <Link href="/chat" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
              <span className="text-sm font-black text-black">S</span>
            </div>
            <span className="text-[15px] font-semibold text-white tracking-tight">S-Rank</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-zinc-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && item.href !== "/settings" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                }`}>
                <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                <span>{item.label}</span>
                {item.href === "/chat" && agentWorking && (
                  <span className="ml-auto w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-3 border-t border-white/5">
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-300 truncate">Mon compte</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 h-12 px-4 border-b border-white/5 bg-[#0a0a0a]">
          <button onClick={() => setSidebarOpen(true)} className="text-zinc-500 hover:text-white">
            <Menu size={20} />
          </button>
          <span className="text-sm font-medium text-zinc-300">
            {NAV_ITEMS.find((n) => pathname.startsWith(n.href))?.label || "S-Rank"}
          </span>
        </div>

        <main className="flex-1 overflow-hidden"><PaywallGate>{children}</PaywallGate></main>
      </div>
    </div>
  );
}
