"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const NAV_ITEMS = [
  { href: "/chat", icon: "💬", label: "Chat" },
  { href: "/files", icon: "📁", label: "Fichiers" },
  { href: "/connectors", icon: "🔌", label: "Connecteurs" },
  { href: "/skills", icon: "🧩", label: "Skills" },
  { href: "/monitoring", icon: "📊", label: "Monitoring" },
  { href: "/settings", icon: "⚙️", label: "Paramètres" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-srank-surface border-r border-srank-border flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="p-5 border-b border-srank-border">
        <Link href="/chat" className="flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          <span className="text-lg font-bold bg-gradient-to-r from-srank-primary to-srank-cyan bg-clip-text text-transparent">
            S-Rank Agent
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-srank-primary/10 text-srank-primary border border-srank-primary/20"
                  : "text-srank-text-secondary hover:text-srank-text-primary hover:bg-srank-hover"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Server Status */}
      <div className="p-3 border-t border-srank-border">
        <div className="px-3 py-2 rounded-lg bg-srank-card">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-srank-green animate-pulse" />
            <span className="text-xs text-srank-text-secondary">Serveur actif</span>
          </div>
          <div className="flex justify-between text-xs text-srank-text-muted">
            <span>CPU 12%</span>
            <span>RAM 25%</span>
            <span>Disk 32%</span>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="p-4 border-t border-srank-border flex items-center gap-3">
        <UserButton afterSignOutUrl="/" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">Mon compte</p>
          <p className="text-xs text-srank-primary">Plan Pro</p>
        </div>
      </div>
    </aside>
  );
}
