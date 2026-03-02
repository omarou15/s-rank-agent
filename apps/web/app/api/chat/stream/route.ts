export const runtime = "edge";

// Trim history to avoid token explosion
function trimHistory(history: any[], maxMessages: number = 30): any[] {
  if (!history || history.length <= maxMessages) return history || [];
  // Keep first 2 messages (context) + last N messages
  const first = history.slice(0, 2);
  const recent = history.slice(-(maxMessages - 2));
  return [...first, { role: "user", content: "[...historique tronqué pour économiser les tokens...]" }, ...recent];
}

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
  if (installedSkills?.length) extras += `\nSKILLS: ${installedSkills.slice(0, 10).join(", ")}${installedSkills.length > 10 ? ` (+${installedSkills.length - 10})` : ""}`;
  if (activeConnectors?.length) {
    extras += `\nMCP: ${activeConnectors.join(", ")}
Routes: /api/mcp/[service]/[action] + header x-connector-token.`;
  }

  const orchSection = isOrch ? `\nORCHESTRATEUR: Tu NE codes JAMAIS. Utilise [DELEGATE:lang] brief [/DELEGATE]. Sub-agent code.\n` : "";
  const execSection = isOrch
    ? "Exec: [DELEGATE:lang] brief [/DELEGATE]"
    : "Exec: [EXEC:python3] code [/EXEC] ou [EXEC:bash] ou [EXEC:node]";

  const systemPrompt = `S-Rank Agent. PC cloud Ubuntu ARM.

CONCIS: 2-3 lignes MAX avant d'agir. Pas de reformulation. Action immediate.
AUTONOMIE: Fais, ne demande pas. Demande seulement si un acces manque.
${orchSection}
${execSection}
Fichiers: [FILE:/chemin] | Images: plt.savefig(dpi=150, facecolor='#0a0a0a') + [FILE:path]
Artifacts: [ARTIFACT:titre] html [/ARTIFACT] | Docs: python-docx/openpyxl/pptx
Vision: Tu analyses les images uploadees | HOME: ${userHome}
${extras}

BOUCLE: Apres ${isOrch ? "[DELEGATE]" : "[EXEC]"}, tu recois stdout/stderr. Corrige si erreur. Sans bloc = fin. Max 15 iter.
${trustLine[trust]}
${memoryContext ? `CTX: ${memoryContext}` : ""}
MEMOIRE: [MEMORY:fait] | Langue: francais.`;

  // Trim history to stay within token limits
  const prevMessages = trimHistory(history, 20);

  let userContent: any;
  if (images && images.length > 0) {
    const parts: any[] = [];
    for (const img of images) {
      parts.push({ type: "image", source: { type: "base64", media_type: img.mediaType || "image/jpeg", data: img.base64 } });
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
    const errorText = await response.text();
    
    // Better error messages
    if (response.status === 429 || errorText.includes("rate_limit")) {
      return Response.json({ 
        error: "⏳ Rate limit atteint — attends 30 secondes puis réessaie. Ton plan API Anthropic a une limite de tokens/minute. Tu peux l'augmenter sur console.anthropic.com → Plans." 
      }, { status: 429 });
    }
    if (errorText.includes("invalid_api_key") || response.status === 401) {
      return Response.json({ error: "🔑 Clé API invalide ou expirée. Vérifie-la dans les paramètres." }, { status: 401 });
    }
    if (errorText.includes("overloaded") || response.status === 529) {
      return Response.json({ error: "🔄 Claude est surchargé. Réessaie dans quelques secondes." }, { status: 529 });
    }
    
    return Response.json({ error: `Claude API error: ${errorText}` }, { status: 400 });
  }

  return new Response(response.body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
  });
}
