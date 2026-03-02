"use client";

import { useState, useEffect } from "react";
import { Search, Download, Star, Check, Sparkles } from "lucide-react";

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  author: string;
  isOfficial: boolean;
  installs: number;
  rating: number;
  installed?: boolean;
}

const SKILLS: Skill[] = [
  { id: "1", name: "Web Scraper", description: "Extraire des données de n'importe quel site web. Tables, texte, images, liens.", category: "Data", author: "S-Rank", isOfficial: true, installs: 2340, rating: 48 },
  { id: "2", name: "Data Analyst", description: "Analyser CSV, Excel, SQL. Graphiques, stats, rapports automatiques.", category: "Data", author: "S-Rank", isOfficial: true, installs: 1890, rating: 47 },
  { id: "3", name: "DevOps Auto", description: "CI/CD, Docker, Kubernetes. Déploiement automatisé.", category: "DevOps", author: "S-Rank", isOfficial: true, installs: 1560, rating: 46 },
  { id: "4", name: "Content Writer", description: "Articles, emails, posts sociaux, landing pages. SEO optimisé.", category: "Content", author: "S-Rank", isOfficial: true, installs: 3200, rating: 49 },
  { id: "5", name: "API Builder", description: "APIs REST et GraphQL. Documentation auto, tests, déploiement.", category: "Development", author: "S-Rank", isOfficial: true, installs: 1420, rating: 46 },
  { id: "6", name: "SEO Optimizer", description: "Audit SEO, mots-clés, meta tags, sitemap, performance.", category: "Marketing", author: "S-Rank", isOfficial: true, installs: 980, rating: 44 },
  { id: "7", name: "PDF Generator", description: "Rapports PDF, factures, certificats à partir de données.", category: "Tools", author: "S-Rank", isOfficial: true, installs: 1100, rating: 45 },
  { id: "8", name: "Email Automator", description: "Templates email, envoi en masse, suivi des ouvertures.", category: "Marketing", author: "Community", isOfficial: false, installs: 540, rating: 42 },
  { id: "9", name: "Git Workflow", description: "Branches, merge, conflict resolution, changelog auto.", category: "Development", author: "Community", isOfficial: false, installs: 760, rating: 43 },
  { id: "10", name: "Database Manager", description: "Migrations, backups, queries optimisées, monitoring.", category: "Data", author: "Community", isOfficial: false, installs: 620, rating: 41 },
];

export default function SkillsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [skills, setSkills] = useState(SKILLS);
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("s-rank-installed-skills");
    if (stored) {
      const ids = JSON.parse(stored) as string[];
      setSkills((prev) => prev.map((s) => ({ ...s, installed: ids.includes(s.id) })));
    }
  }, []);

  const installSkill = async (id: string) => {
    setInstalling(id);
    await new Promise((r) => setTimeout(r, 1200));
    setSkills((prev) => prev.map((s) => s.id === id ? { ...s, installed: true } : s));
    const installed = skills.filter((s) => s.installed || s.id === id).map((s) => s.id);
    localStorage.setItem("s-rank-installed-skills", JSON.stringify(installed));
    setInstalling(null);
  };

  const uninstallSkill = (id: string) => {
    setSkills((prev) => prev.map((s) => s.id === id ? { ...s, installed: false } : s));
    const installed = skills.filter((s) => s.installed && s.id !== id).map((s) => s.id);
    localStorage.setItem("s-rank-installed-skills", JSON.stringify(installed));
  };

  const categories = ["all", ...new Set(SKILLS.map((s) => s.category))];
  const filtered = skills
    .filter((s) => category === "all" || s.category === category)
    .filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-white">Skills Marketplace</h1>
          <p className="text-xs text-zinc-500 mt-1">{skills.filter((s) => s.installed).length} installés · {SKILLS.length} disponibles</p>
        </div>

        {/* Search + Filters */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un skill..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500" />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                category === cat ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}>
              {cat === "all" ? "Tous" : cat}
            </button>
          ))}
        </div>

        {/* Skills grid */}
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((skill) => (
            <div key={skill.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{skill.name}</span>
                    {skill.isOfficial && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-violet-600/20 text-violet-400 rounded-full">
                        <Sparkles size={10} /> Officiel
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-600">{skill.author}</span>
                </div>
                <span className="text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">{skill.category}</span>
              </div>

              <p className="text-xs text-zinc-400 flex-1 mb-3">{skill.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-0.5"><Download size={10} /> {skill.installs.toLocaleString()}</span>
                  <span className="flex items-center gap-0.5"><Star size={10} /> {(skill.rating / 10).toFixed(1)}</span>
                </div>

                {skill.installed ? (
                  <button onClick={() => uninstallSkill(skill.id)}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-emerald-600/10 text-emerald-400 rounded-lg hover:bg-red-600/10 hover:text-red-400 transition-colors">
                    <Check size={12} /> Installé
                  </button>
                ) : (
                  <button onClick={() => installSkill(skill.id)} disabled={installing === skill.id}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50">
                    {installing === skill.id ? "Installation..." : "Installer"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
