export const runtime = "edge";

export async function POST(req: Request) {
  const body = await req.json();
  const { content, apiKey, model, history, trustLevel, memoryContext } = body;

  if (!apiKey) return Response.json({ error: "API key required." }, { status: 400 });
  if (!content) return Response.json({ error: "Message required." }, { status: 400 });

  const trustInstructions: Record<number, string> = {
    1: "NIVEAU DE CONFIANCE 1 (Supervision) : Demande TOUJOURS confirmation à l'utilisateur avant d'exécuter du code, créer/supprimer des fichiers, ou appeler des APIs. Propose le code mais attends le feu vert.",
    2: "NIVEAU DE CONFIANCE 2 (Prudent) : Tu peux exécuter du code et créer des fichiers librement. Demande confirmation UNIQUEMENT pour les actions destructives (supprimer des fichiers, déployer en production, effectuer des paiements).",
    3: "NIVEAU DE CONFIANCE 3 (Autonome) : Exécute toutes les actions librement. Notifie l'utilisateur de ce que tu as fait après coup. Sois proactif.",
    4: "NIVEAU DE CONFIANCE 4 (Full Auto) : Mode 100% autonome. Enchaîne les actions sans interruption. Fais tout ce qu'il faut pour accomplir la tâche. Log tout.",
  };

  const trust = trustInstructions[trustLevel || 2] || trustInstructions[2];
  const memory = memoryContext || "";

  const messages = [...(history || []), { role: "user", content }];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-sonnet-4-20250514",
      max_tokens: 8192,
      stream: true,
      system: `Tu es S-Rank Agent, un agent IA autonome avec un PC cloud (Ubuntu ARM, 2 vCPU, 4GB RAM).
Tu peux exécuter du code (Python, Node.js, Bash), gérer des fichiers, et déployer des apps.
Sois concis et orienté action. Utilise des blocs de code markdown quand tu proposes du code.

Quand l'utilisateur te dit quelque chose sur lui-même (son nom, son métier, ses préférences, ses projets), retiens-le en ajoutant [MEMORY:fait] dans ta réponse. Exemple: [MEMORY:L'utilisateur s'appelle Marc et travaille en marketing].

Si l'utilisateur te demande de chercher sur le web, propose un script Python avec requests/beautifulsoup pour scraper l'info demandée, puis exécute-le.

${trust}
${memory ? `\nMÉMOIRE UTILISATEUR:\n${memory}` : ""}`,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return Response.json({ error: `Claude API error: ${error}` }, { status: 400 });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
