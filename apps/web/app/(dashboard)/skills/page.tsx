"use client";

import { useState } from "react";

const OFFICIAL_SKILLS = [
  { id: "1", name: "Web Scraper", icon: "🕷️", category: "data", desc: "Extraire des données de n'importe quel site web", installs: 2340, rating: 4.8, source: "official" },
  { id: "2", name: "Data Analyst", icon: "📊", category: "data", desc: "Analyser des CSV, Excel, et bases de données", installs: 1890, rating: 4.7, source: "official" },
  { id: "3", name: "DevOps Auto", icon: "🔧", category: "devops", desc: "CI/CD, Docker, déploiement automatisé", installs: 1560, rating: 4.6, source: "official" },
  { id: "4", name: "SEO Optimizer", icon: "🔍", category: "marketing", desc: "Audit SEO, suggestions d'optimisation, reporting", installs: 980, rating: 4.5, source: "official" },
  { id: "5", name: "Content Writer", icon: "✍️", category: "content", desc: "Articles, emails, posts réseaux sociaux", installs: 3200, rating: 4.9, source: "official" },
  { id: "6", name: "API Builder", icon: "🔌", category: "development", desc: "Créer des APIs REST/GraphQL rapidement", installs: 1420, rating: 4.6, source: "official" },
  { id: "7", name: "PDF Generator", icon: "📕", category: "productivity", desc: "Créer des rapports et documents PDF", installs: 870, rating: 4.4, source: "community" },
  { id: "8", name: "Email Automator", icon: "📧", category: "marketing", desc: "Séquences email automatisées", installs: 650, rating: 4.3, source: "community" },
];

export default function SkillsPage() {
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all"
    ? OFFICIAL_SKILLS
    : filter === "installed"
      ? OFFICIAL_SKILLS.filter((s) => installed.has(s.id))
      : OFFICIAL_SKILLS.filter((s) => s.category === filter);

  return (
    <div className="h-screen overflow-y-auto">
      <div className="px-6 py-4 border-b border-srank-border flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Skills Marketplace</h1>
          <p className="text-xs text-srank-text-muted mt-1">
            Installe des skills pour spécialiser ton agent
          </p>
        </div>
        <button className="px-4 py-2 text-xs bg-srank-primary/10 text-srank-primary border border-srank-primary/20 rounded-lg hover:bg-srank-primary/20">
          + Publier un skill
        </button>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-srank-border flex gap-2 overflow-x-auto">
        {["all", "installed", "development", "data", "content", "devops", "marketing", "productivity"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors ${
              filter === f
                ? "bg-srank-primary text-white"
                : "bg-srank-card text-srank-text-secondary hover:bg-srank-hover"
            }`}
          >
            {f === "all" ? "Tous" : f === "installed" ? `Installés (${installed.size})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Skills grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((skill) => (
          <div key={skill.id} className="p-5 rounded-xl bg-srank-card border border-srank-border hover:border-srank-primary/20 transition-all">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-3xl">{skill.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{skill.name}</h3>
                  {skill.source === "official" && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-srank-primary/10 text-srank-primary rounded">Official</span>
                  )}
                </div>
                <p className="text-xs text-srank-text-muted mt-0.5">{skill.desc}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-srank-text-muted">
                <span>⭐ {skill.rating}</span>
                <span>📥 {skill.installs.toLocaleString()}</span>
              </div>
              <button
                onClick={() => {
                  setInstalled((prev) => {
                    const next = new Set(prev);
                    next.has(skill.id) ? next.delete(skill.id) : next.add(skill.id);
                    return next;
                  });
                }}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  installed.has(skill.id)
                    ? "bg-srank-green/10 text-srank-green border border-srank-green/20"
                    : "bg-srank-primary text-white hover:bg-srank-primary-600"
                }`}
              >
                {installed.has(skill.id) ? "✓ Installé" : "Installer"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
