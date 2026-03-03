export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await req.json();
  const { content, history, vpsHost, vpsPassword } = body;

  if (!vpsHost || !vpsPassword) {
    return Response.json({ error: "VPS non configuré. Configure l'IP et le mot de passe dans les paramètres." }, { status: 400 });
  }
  if (!content) {
    return Response.json({ error: "Message requis." }, { status: 400 });
  }

  // Build context from history (last 5 messages)
  const recentHistory = (history || []).slice(-10);
  const contextLines = recentHistory
    .map((m: any) => `${m.role === "user" ? "User" : "Assistant"}: ${typeof m.content === "string" ? m.content.slice(0, 500) : "[media]"}`)
    .join("\n");

  const fullPrompt = contextLines 
    ? `Contexte de la conversation:\n${contextLines}\n\nNouvelle demande: ${content}`
    : content;

  // Execute claude -p on VPS via SSH
  // We use the VPS exec endpoint if available, otherwise direct SSH
  try {
    const execRes = await fetch(`http://${vpsHost}:3100/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lang: "bash",
        code: `claude -p ${JSON.stringify(fullPrompt)} --output-format text 2>&1`,
        timeout: 120000,
      }),
    });

    if (!execRes.ok) {
      const err = await execRes.text();
      return Response.json({ error: `VPS error: ${err}` }, { status: 500 });
    }

    const result = await execRes.json();
    
    if (result.exitCode !== 0 && result.stderr?.includes("command not found")) {
      return Response.json({ 
        error: "Claude Code n'est pas installé sur le VPS. Installe-le avec:\nnpm install -g @anthropic-ai/claude-code\npuis connecte-toi avec: claude login" 
      }, { status: 400 });
    }

    // Return the response as a stream-like format for compatibility
    const output = result.stdout || result.stderr || "Pas de réponse";
    
    return Response.json({ 
      content: output,
      exitCode: result.exitCode,
      mode: "claude-code"
    });

  } catch (err: any) {
    return Response.json({ 
      error: `Impossible de contacter le VPS (${vpsHost}:3100). Vérifie que le serveur est allumé.` 
    }, { status: 500 });
  }
}
