import { db } from "../db";
import { skills } from "../db/schema";

export const OFFICIAL_SKILLS = [
  {
    name: "Web Scraper",
    slug: "web-scraper",
    description: "Extraire des donnees de sites web. Supporte CSS selectors, pagination, export CSV/JSON.",
    category: "data",
    author: "S-Rank Official",
    isOfficial: true,
    version: "1.0.0",
    config: {
      systemPrompt: "Tu as la capacite de scraper des sites web. Utilise les bibliotheques requests et BeautifulSoup.",
      dependencies: { pip: ["requests", "beautifulsoup4", "lxml"] },
    },
    rating: 48,
    installs: 2340,
  },
  {
    name: "Data Analyst",
    slug: "data-analyst",
    description: "Analyser CSV, Excel, bases de donnees. Statistiques, visualisations, rapports.",
    category: "data",
    author: "S-Rank Official",
    isOfficial: true,
    version: "1.0.0",
    config: {
      systemPrompt: "Tu es un expert en analyse de donnees. Utilise pandas, numpy et matplotlib.",
      dependencies: { pip: ["pandas", "numpy", "matplotlib", "openpyxl", "seaborn"] },
    },
    rating: 47,
    installs: 1890,
  },
  {
    name: "DevOps Auto",
    slug: "devops-auto",
    description: "Automatiser CI/CD, Docker, deploiements. Gestion d'infrastructure.",
    category: "devops",
    author: "S-Rank Official",
    isOfficial: true,
    version: "1.0.0",
    config: {
      systemPrompt: "Tu es un expert DevOps. Tu peux gerer Docker, creer des pipelines CI/CD, et deployer.",
      dependencies: { apt: ["docker-compose"] },
    },
    rating: 46,
    installs: 1560,
  },
  {
    name: "SEO Optimizer",
    slug: "seo-optimizer",
    description: "Audit SEO complet, analyse de mots-cles, optimisation de contenu.",
    category: "marketing",
    author: "S-Rank Official",
    isOfficial: true,
    version: "1.0.0",
    config: {
      systemPrompt: "Tu es un expert SEO. Analyse les sites, propose des ameliorations, genere des meta tags.",
      dependencies: { pip: ["requests", "beautifulsoup4"] },
    },
    rating: 45,
    installs: 980,
  },
  {
    name: "Content Writer",
    slug: "content-writer",
    description: "Rediger articles, emails, posts sociaux. Adapte le ton et le style.",
    category: "content",
    author: "S-Rank Official",
    isOfficial: true,
    version: "1.0.0",
    config: {
      systemPrompt: "Tu es un redacteur expert. Adapte ton style au format demande (article, email, post).",
      dependencies: {},
    },
    rating: 49,
    installs: 3200,
  },
  {
    name: "API Builder",
    slug: "api-builder",
    description: "Creer des APIs REST et GraphQL. Generation de code, documentation auto.",
    category: "development",
    author: "S-Rank Official",
    isOfficial: true,
    version: "1.0.0",
    config: {
      systemPrompt: "Tu es un expert en creation d'APIs. Tu generes du code propre avec documentation.",
      dependencies: { npm: ["express", "cors", "zod"] },
    },
    rating: 46,
    installs: 1420,
  },
  {
    name: "PDF Generator",
    slug: "pdf-generator",
    description: "Generer des rapports PDF professionnels. Tableaux, graphiques, mise en page.",
    category: "content",
    author: "Community",
    isOfficial: false,
    version: "1.0.0",
    config: {
      systemPrompt: "Tu peux generer des PDFs avec ReportLab ou WeasyPrint.",
      dependencies: { pip: ["reportlab", "weasyprint"] },
    },
    rating: 44,
    installs: 870,
  },
  {
    name: "Email Automation",
    slug: "email-auto",
    description: "Creer des sequences email, templates, automatisations.",
    category: "marketing",
    author: "Community",
    isOfficial: false,
    version: "1.0.0",
    config: {
      systemPrompt: "Tu peux creer des templates email et des sequences d'envoi.",
      dependencies: { pip: ["jinja2"] },
    },
    rating: 43,
    installs: 650,
  },
];

export async function seedSkills() {
  console.log("[SEED] Seeding skills...");

  for (const skill of OFFICIAL_SKILLS) {
    const existing = await db.query.skills.findFirst({
      where: (s, { eq }) => eq(s.slug, skill.slug),
    });

    if (!existing) {
      await db.insert(skills).values(skill as any);
      console.log(`[SEED] Created skill: ${skill.name}`);
    } else {
      console.log(`[SEED] Skill exists: ${skill.name}`);
    }
  }

  console.log("[SEED] Skills seeded.");
}
