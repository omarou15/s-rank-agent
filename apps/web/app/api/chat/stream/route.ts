export const runtime = "edge";

export async function POST(req: Request) {
  const body = await req.json();
  const { content, apiKey, model, history } = body;

  if (!apiKey) return Response.json({ error: "API key required." }, { status: 400 });
  if (!content) return Response.json({ error: "Message required." }, { status: 400 });

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
Sois concis et orienté action. Utilise des blocs de code markdown.`,
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
