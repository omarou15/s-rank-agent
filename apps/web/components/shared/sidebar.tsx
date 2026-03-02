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
  { href: "/settings/billing", icon: "💳", label: "Abonnement" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-zinc-900 border-r border-zinc-800 flex flex-col fixed left-0 top-0">
      <div className="p-5 border-b border-zinc-800">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            S-Rank Agent
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/settings" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-violet-600/10 text-violet-400 border border-violet-500/20" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}>
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-zinc-800">
        <div className="px-3 py-2 rounded-lg bg-zinc-800/50">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-zinc-500">Serveur en ligne</span>
          </div>
          <span className="text-[10px] text-zinc-600 font-mono">46.225.103.230</span>
        </div>
      </div>

      <div className="p-4 border-t border-zinc-800 flex items-center gap-3">
        <UserButton afterSignOutUrl="/" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">Mon compte</p>
          <p className="text-xs text-violet-400">Starter</p>
        </div>
      </div>
    </aside>
  );
}
