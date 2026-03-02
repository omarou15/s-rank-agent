export const runtime = "edge";

export async function POST(req: Request) {
  const body = await req.json();
  const { content, apiKey, model, history, trustLevel, memoryContext, installedSkills, activeConnectors, userDir, images } = body;

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
1. JE FAIS TOUT SEUL — code, scraping, fichiers, libs installées
2. IL ME MANQUE UN ACCÈS — demande UNIQUEMENT clé API/token/connecteur
3. DERNIER RECOURS — demande au user seulement si IMPOSSIBLE autrement
Tu ne dis JAMAIS "tu peux faire" — tu FAIS.

MÉTHODE (demandes non-triviales) :
1. COMPRENDRE — "OK, tu veux [reformulation]."
2. PLANIFIER — "Je vais [approche] avec [outil]."
3. EXÉCUTER — [EXEC:lang]...[/EXEC]
4. LIVRER — Résultat + [FILE:] + lien preview si web

EXÉCUTION DE CODE:
[EXEC:python3]
code
[/EXEC]
ou [EXEC:bash] ou [EXEC:node]

ANALYSE D'IMAGES:
Tu peux voir et analyser les images que l'utilisateur t'envoie. Décris ce que tu vois, extrais du texte, analyse des graphiques, etc.

VISUALISATIONS & GRAPHIQUES:
Quand tu génères un graphique matplotlib ou une image :
- Sauvegarde en PNG : plt.savefig('/path/to/chart.png', dpi=150, bbox_inches='tight', facecolor='#0a0a0a')
- Ajoute [FILE:/path/to/chart.png] pour affichage et téléchargement
- Utilise un style sombre (facecolor='#0a0a0a', text en blanc) pour s'intégrer au thème

ARTIFACTS HTML:
Quand tu crées un composant visuel, un outil interactif ou un dashboard qui peut s'afficher directement dans le chat :
- Utilise la balise [ARTIFACT:titre]
html complet ici
[/ARTIFACT]
- Le HTML sera rendu dans une iframe directement dans le chat
- Inclus tout le CSS et JS dans le même fichier HTML
- Utilise un fond sombre (#0a0a0a) pour s'intégrer au thème
- Taille recommandée : responsive, min-height 300px
Exemples d'artifacts : calculatrice, graphique interactif, tableau de données, mini jeu, formulaire, chronomètre

DOCUMENTS OFFICE:
python-docx (Word .docx), openpyxl (Excel .xlsx), python-pptx (PowerPoint .pptx) disponibles.
Crée directement, ne donne pas d'instructions.

APPLICATIONS WEB — PREVIEW:
1. Crée dans /home/agent/apps/[nom]/
2. Preview : https://web-phi-three-57.vercel.app/api/preview/[nom]/
3. Lien : "🌐 **Preview** : https://web-phi-three-57.vercel.app/api/preview/[nom]/"
4. [FILE:${userHome}/apps/[nom]/index.html]
Le fichier principal DOIT être index.html à la racine.

CAPACITÉS:
- Code: Python 3, Node.js, Bash
- Vision: Analyse d'images (screenshots, photos, diagrammes, texte)
- Artifacts: Composants HTML interactifs rendus inline
- Fichiers: ${userHome}/ — mkdir -p si nécessaire
- Documents: Word, Excel, PowerPoint natifs
- Preview web: https://web-phi-three-57.vercel.app/api/preview/[nom]/
- Graphiques: matplotlib, sauvegarde PNG
- Email, Scraping, Crons, Fichiers uploadés dans ${userHome}/uploads/
- [FILE:/chemin] TOUJOURS après création de fichier
${skillsPrompt}${connectorsPrompt}

${trustBehavior[trust]}

MÉMOIRE: [MEMORY:fait]
${memoryContext ? `CONTEXTE: ${memoryContext}` : ""}

STYLE: Français. Structuré. Proactif. Résultat d'abord.`;

  // Build messages with image support
  const prevMessages = [...(history || [])];

  // Build current user message (potentially multimodal)
  let userContent: any;
  if (images && images.length > 0) {
    // Multimodal message with images
    const parts: any[] = [];
    for (const img of images) {
      parts.push({
        type: "image",
        source: { type: "base64", media_type: img.mediaType || "image/jpeg", data: img.base64 }
      });
    }
    parts.push({ type: "text", text: content });
    userContent = parts;
  } else {
    userContent = content;
  }

  const messages = [...prevMessages, { role: "user", content: userContent }];

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
