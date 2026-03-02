export const runtime = "edge";

export async function POST(req: Request) {
  const body = await req.json();
  const { content, apiKey, model, history, trustLevel, memoryContext, installedSkills, activeConnectors, userDir, images, orchestratorMode } = body;

  if (!apiKey) return Response.json({ error: "API key required." }, { status: 400 });
  if (!content) return Response.json({ error: "Message required." }, { status: 400 });

  const trust = trustLevel || 2;
  const userHome = userDir || "/home/agent";
  const isOrch = orchestratorMode === true;

  const trustLine: Record<number, string> = {
    1: "AUTONOMIE 1: Confirme avant chaque action.",
    2: "AUTONOMIE 2: Safe = fais. Critique (supprimer/deployer/payer) = confirme.",
    3: "AUTONOMIE 3: Fais tout. Resume court apres.",
    4: "AUTONOMIE 4: Full auto. Corrige seul.",
  };

  let extras = "";
  if (installedSkills?.length) extras += `\nSKILLS: ${installedSkills.join(", ")}`;
  if (activeConnectors?.length) {
    extras += `\nCONNECTEURS MCP: ${activeConnectors.join(", ")}
Appel: fetch /api/mcp/[service]/[action] avec header x-connector-token.
Routes: GitHub(repos,issues,create-issue,file,commit), Slack(channels,send,messages), GDrive(files,download), Stripe(customers,payments,products,create-product), Vercel(projects,deployments), Clerk(users,ban,unban,sessions), PostgreSQL(query).`;
  }

  const orchSection = isOrch ? `
MODE ORCHESTRATEUR ACTIF:
Tu NE codes JAMAIS toi-meme. Pour coder, utilise:
[DELEGATE:python3]
Brief technique precis: quoi faire, paths exacts, format de sortie.
[/DELEGATE]
Un sub-agent dev genere le code, qui s'execute automatiquement.
Tes briefs doivent etre COMPLETS (le sub-agent ne voit pas l'historique).
` : "";

  const execSection = isOrch
    ? "Pour executer: [DELEGATE:lang] brief [/DELEGATE]. Le sub-agent code, le systeme execute."
    : "Pour executer: [EXEC:python3] code [/EXEC] ou [EXEC:bash] ou [EXEC:node]";

  const systemPrompt = `Tu es S-Rank Agent, agent IA autonome sur un PC cloud Ubuntu ARM.

=== REGLE CRITIQUE: SOIS CONCIS ===
Tu parles en 2-3 lignes MAX avant d'agir. Le user voit TOUT ton output.
MAL: "Bien sur ! Je vais d'abord analyser ta demande, puis je vais creer un script Python qui..."
BIEN: "Je cree le scraper."
MAL: "Voici ce que j'ai fait : 1) J'ai cree le fichier... 2) J'ai ajoute... 3) Le resultat..."
BIEN: "Scraper cree. 42 resultats extraits. [FILE:/home/agent/results.csv]"

Pas de reformulation de la demande. Pas de liste de plan. Pas de reflexion a voix haute.
Action immediate, resultat concis.

=== AUTONOMIE ===
FAIS, ne demande pas. Demande seulement si un acces manque (cle API/token).
${orchSection}
=== OUTILS ===
${execSection}
Fichiers: [FILE:/chemin] apres creation
Images: plt.savefig(path, dpi=150, facecolor='#0a0a0a') + [FILE:path]
Artifacts HTML: [ARTIFACT:titre] html [/ARTIFACT] (fond #0a0a0a)
Preview: /home/agent/apps/[nom]/index.html puis https://web-phi-three-57.vercel.app/api/preview/[nom]/
Documents: python-docx, openpyxl, python-pptx
Vision: Tu vois et analyses les images uploadees
HOME: ${userHome}
${extras}

=== BOUCLE ===
Apres chaque ${isOrch ? "[DELEGATE]" : "[EXEC]"}, tu recois stdout/stderr/exitCode.
Corrige si erreur, continue si OK, ou reponds sans bloc = fin de boucle.
1-2 blocs max par reponse. Max 15 iterations.

${trustLine[trust]}
${memoryContext ? `CONTEXTE: ${memoryContext}` : ""}
MEMOIRE: [MEMORY:fait] pour retenir un fait.
Langue: francais.`;

  // Build messages with image support
  const prevMessages = [...(history || [])];

  let userContent: any;
  if (images && images.length > 0) {
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
