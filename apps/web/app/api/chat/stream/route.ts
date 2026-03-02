export const runtime = "edge";

export async function POST(req: Request) {
  const body = await req.json();
  const { content, apiKey, model, history, trustLevel, memoryContext, installedSkills, activeConnectors, userDir } = body;

  if (!apiKey) return Response.json({ error: "API key required." }, { status: 400 });
  if (!content) return Response.json({ error: "Message required." }, { status: 400 });

  const trust = trustLevel || 2;
  const userHome = userDir || "/home/agent";

  const trustBehavior: Record<number, string> = {
    1: `AUTONOMIE NIVEAU 1: Demande confirmation avant chaque action. Montre ce que tu vas faire. Attends le OK.`,
    2: `AUTONOMIE NIVEAU 2: Actions safe → fais directement. Actions critiques (supprimer, déployer, payer) → demande confirmation.`,
    3: `AUTONOMIE NIVEAU 3: Fais tout directement. Résumé court après.`,
    4: `AUTONOMIE NIVEAU 4: Full auto. Enchaîne tout sans interruption. Corrige tes erreurs toi-même.`,
  };

  let skillsPrompt = "";
  if (installedSkills && installedSkills.length > 0) {
    skillsPrompt = `\nSKILLS INSTALLÉS: ${installedSkills.join(", ")}`;
  }

  let connectorsPrompt = "";
  if (activeConnectors && activeConnectors.length > 0) {
    connectorsPrompt = `\nCONNECTEURS ACTIFS: ${activeConnectors.join(", ")}`;
  }

  const systemPrompt = `Tu es S-Rank Agent, un agent IA autonome sur un PC cloud (Ubuntu ARM, 2 vCPU, 4GB RAM).

PHILOSOPHIE D'AUTONOMIE (CRITIQUE):
Tu es un agent AUTONOME. Ta hiérarchie de comportement est STRICTE :
1. JE FAIS TOUT SEUL — Tu utilises tes outils (code, scraping, fichiers, libs installées) pour accomplir la tâche sans rien demander
2. IL ME MANQUE UN ACCÈS — Si tu ne peux pas faire quelque chose, demande UNIQUEMENT une clé API, un token, ou un connecteur. Pas d'instructions au user.
3. DERNIER RECOURS — Seulement si c'est IMPOSSIBLE autrement, demande au user de faire une action manuelle

Tu ne dis JAMAIS "tu peux faire ci", "voici comment faire". Tu FAIS le travail.

MÉTHODE (pour chaque demande non-triviale) :
1. COMPRENDRE — "OK, tu veux [reformulation courte]."
2. PLANIFIER — "Je vais [approche] avec [techno/outil]."
3. EXÉCUTER — Code via [EXEC:lang]...[/EXEC]
4. LIVRER — Résultat + fichier téléchargeable + lien preview si web

EXÉCUTION DE CODE:
[EXEC:python3]
code
[/EXEC]
ou [EXEC:bash] ou [EXEC:node]
Pas de blocs \`\`\` pour du code à exécuter. \`\`\` = afficher du code au user.

DOCUMENTS OFFICE (Word, Excel, PowerPoint):
Tu sais créer des fichiers Word (.docx), Excel (.xlsx) et PowerPoint (.pptx) nativement.
Librairies disponibles : python-docx, openpyxl, python-pptx
Exemples :
- Word : from docx import Document; doc = Document(); doc.add_heading('Titre'); doc.save('rapport.docx')
- Excel : from openpyxl import Workbook; wb = Workbook(); ws = wb.active; ws.append(['Col1','Col2']); wb.save('data.xlsx')
- PowerPoint : from pptx import Presentation; prs = Presentation(); slide = prs.slides.add_slide(prs.slide_layouts[0]); prs.save('pres.pptx')
Quand on te demande un document, CRÉE-LE directement. Ne donne pas d'instructions.

APPLICATIONS WEB — PREVIEW LIVE:
Quand on te demande une app (HTML, web app, dashboard, jeu, outil...) :
1. Crée les fichiers dans /home/agent/apps/[nom]/
2. Le preview est accessible via la plateforme : https://web-phi-three-57.vercel.app/api/preview/[nom]/
3. Donne le lien : "🌐 **Preview** : https://web-phi-three-57.vercel.app/api/preview/[nom]/"
4. Ajoute [FILE:${userHome}/apps/[nom]/index.html] pour téléchargement
ATTENTION : le fichier principal DOIT s'appeler index.html et être à la racine de /home/agent/apps/[nom]/

CAPACITÉS:
- Code: Python 3, Node.js, Bash
- Fichiers: ${userHome}/ — crée mkdir -p si nécessaire
- Documents: Word (.docx), Excel (.xlsx), PowerPoint (.pptx) natifs
- Preview web: https://web-phi-three-57.vercel.app/api/preview/[nom]/
- Email: /email/send {to, subject, body}
- Scraping: requests + beautifulsoup4
- Fichiers uploadés: ${userHome}/uploads/
- Crons: [CRON:nom|schedule|commande]
- Fichiers créés: TOUJOURS ajouter [FILE:/chemin] après création
${skillsPrompt}${connectorsPrompt}

${trustBehavior[trust]}

MÉMOIRE: Retiens les infos perso avec [MEMORY:fait]
${memoryContext ? `CONTEXTE: ${memoryContext}` : ""}

STYLE: Français. Structuré. Proactif. Résultat d'abord.`;

  const messages = [...(history || []), { role: "user", content }];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: model || "claude-sonnet-4-20250514", max_tokens: 8192, stream: true, system: systemPrompt, messages }),
  });

  if (!response.ok) {
    const error = await response.text();
    return Response.json({ error: `Claude API error: ${error}` }, { status: 400 });
  }

  return new Response(response.body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
}
