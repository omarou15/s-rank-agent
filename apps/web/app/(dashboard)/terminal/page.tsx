"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Terminal as TermIcon, Loader2, Zap, ChevronRight, Trash2, Copy, Check, Bot } from "lucide-react";

interface CommandEntry {
  id: string;
  command: string;
  output: string;
  exitCode: number;
  duration: number;
  timestamp: number;
  isClaudeCode?: boolean;
}

export default function TerminalPage() {
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<CommandEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [claudeCodeMode, setClaudeCodeMode] = useState(false);
  const [claudeThinking, setClaudeThinking] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const execCommand = useCallback(async (cmd: string) => {
    if (!cmd.trim() || running) return;
    setRunning(true);
    const id = `cmd-${Date.now()}`;

    // Add command to history immediately
    setHistory(prev => [...prev, { id, command: cmd, output: "...", exitCode: -1, duration: 0, timestamp: Date.now() }]);

    try {
      // Detect language
      let lang = "bash";
      if (cmd.startsWith("python ") || cmd.startsWith("python3 ") || cmd.endsWith(".py")) lang = "python3";
      else if (cmd.startsWith("node ") || cmd.endsWith(".js")) lang = "node";

      // If Claude Code mode, send to Claude first to get the command
      if (claudeCodeMode && !cmd.startsWith("!")) {
        setClaudeThinking(true);
        const apiKey = localStorage.getItem("s-rank-api-key");
        if (!apiKey) {
          setHistory(prev => prev.map(h => h.id === id ? { ...h, output: "❌ Clé API Claude requise. Va dans Paramètres.", exitCode: 1, duration: 0 } : h));
          setRunning(false);
          setClaudeThinking(false);
          return;
        }

        // Ask Claude to generate a command
        const res = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `Tu es en mode Claude Code. L'utilisateur te demande: "${cmd}". 
Réponds UNIQUEMENT avec la commande bash/python à exécuter, sans explication, sans markdown, sans backticks. 
Juste la commande brute. Si c'est plusieurs commandes, sépare-les par && ou ;.
Environnement: Ubuntu ARM, Python 3, Node.js, serveur cloud.`,
            apiKey,
            history: [],
            trustLevel: 4,
          }),
        });

        let claudeCmd = "";
        const reader = res.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n"); buffer = lines.pop() || "";
            for (const line of lines) {
              if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
              try { const e = JSON.parse(line.slice(6)); if (e.delta?.text) claudeCmd += e.delta.text; } catch {}
            }
          }
        }
        setClaudeThinking(false);

        claudeCmd = claudeCmd.trim().replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "").trim();

        if (!claudeCmd) {
          setHistory(prev => prev.map(h => h.id === id ? { ...h, output: "Claude n'a pas pu générer de commande", exitCode: 1, duration: 0 } : h));
          setRunning(false);
          return;
        }

        // Show Claude's interpretation
        setHistory(prev => prev.map(h => h.id === id ? { ...h, command: `🤖 ${cmd}\n$ ${claudeCmd}`, isClaudeCode: true } : h));

        // Execute the generated command
        const execRes = await fetch("/api/exec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: claudeCmd, language: "bash" }),
        });
        const result = await execRes.json();
        setHistory(prev => prev.map(h => h.id === id ? {
          ...h,
          output: (result.stdout || "") + (result.stderr ? `\n${result.stderr}` : ""),
          exitCode: result.exitCode ?? 0,
          duration: result.duration || 0,
          isClaudeCode: true,
        } : h));
      } else {
        // Direct execution
        const actualCmd = cmd.startsWith("!") ? cmd.slice(1) : cmd;
        const execRes = await fetch("/api/exec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: actualCmd, language: lang }),
        });
        const result = await execRes.json();
        setHistory(prev => prev.map(h => h.id === id ? {
          ...h,
          command: actualCmd,
          output: (result.stdout || "") + (result.stderr ? `\n${result.stderr}` : ""),
          exitCode: result.exitCode ?? 0,
          duration: result.duration || 0,
        } : h));
      }
    } catch (err: any) {
      setHistory(prev => prev.map(h => h.id === id ? { ...h, output: err.message || "Erreur", exitCode: 1, duration: 0 } : h));
    } finally {
      setRunning(false);
      setCommand("");
      setHistoryIndex(-1);
    }
  }, [running, claudeCodeMode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); execCommand(command); }
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      const cmds = history.map(h => h.command.split("\n").pop() || h.command);
      const newIdx = Math.min(historyIndex + 1, cmds.length - 1);
      setHistoryIndex(newIdx);
      setCommand(cmds[cmds.length - 1 - newIdx] || "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const cmds = history.map(h => h.command.split("\n").pop() || h.command);
      const newIdx = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIdx);
      setCommand(newIdx >= 0 ? cmds[cmds.length - 1 - newIdx] || "" : "");
    }
  };

  const copyOutput = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <TermIcon size={16} className="text-emerald-400" />
          <h1 className="text-sm font-semibold text-white">Terminal</h1>
          <span className="text-[10px] text-zinc-600 font-mono">agent@s-rank:~</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setClaudeCodeMode(!claudeCodeMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              claudeCodeMode
                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-violet-500/30"
            }`}
          >
            <Bot size={14} />
            Claude Code {claudeCodeMode ? "ON" : "OFF"}
          </button>
          <button onClick={() => setHistory([])} className="text-zinc-500 hover:text-white p-1">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Claude Code info banner */}
      {claudeCodeMode && (
        <div className="px-4 py-2 bg-violet-600/10 border-b border-violet-500/20">
          <p className="text-xs text-violet-400">
            <Bot size={12} className="inline mr-1" />
            <strong>Claude Code</strong> — Décris ce que tu veux en français, Claude traduit en commandes et les exécute.
            Préfixe avec <code className="bg-zinc-800 px-1 rounded">!</code> pour exécuter directement.
          </p>
        </div>
      )}

      {/* Output area */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm" onClick={() => inputRef.current?.focus()}>
        {history.length === 0 && (
          <div className="text-zinc-600 space-y-1">
            <p>Bienvenue sur le terminal S-Rank Agent.</p>
            <p>Serveur: Ubuntu ARM · 2 vCPU · 4GB RAM</p>
            <p className="text-zinc-700">─────────────────────────────</p>
            {claudeCodeMode ? (
              <>
                <p className="text-violet-400">Mode Claude Code activé.</p>
                <p className="text-zinc-500">Exemples: &quot;liste les gros fichiers&quot;, &quot;installe flask&quot;, &quot;crée un serveur express&quot;</p>
              </>
            ) : (
              <p className="text-zinc-500">Tape une commande ou active Claude Code pour du langage naturel.</p>
            )}
          </div>
        )}

        {history.map((entry) => (
          <div key={entry.id} className="mb-3">
            {/* Command */}
            <div className="flex items-start gap-1">
              {entry.isClaudeCode ? (
                <span className="text-violet-400 flex-shrink-0">🤖</span>
              ) : (
                <span className="text-emerald-400 flex-shrink-0">$</span>
              )}
              <pre className="text-zinc-200 whitespace-pre-wrap break-all">{entry.command}</pre>
            </div>
            {/* Output */}
            {entry.output && entry.output !== "..." && (
              <div className="mt-1 ml-4 relative group">
                <pre className={`whitespace-pre-wrap break-all text-xs leading-relaxed ${
                  entry.exitCode === 0 ? "text-zinc-400" : "text-red-400"
                }`}>{entry.output.trim()}</pre>
                <button
                  onClick={() => copyOutput(entry.output, entry.id)}
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-white transition-opacity"
                >
                  {copied === entry.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
                <div className="flex items-center gap-2 mt-1">
                  {entry.exitCode === 0 ? (
                    <span className="text-[10px] text-emerald-600">✓ {entry.duration}ms</span>
                  ) : (
                    <span className="text-[10px] text-red-600">✗ exit {entry.exitCode}</span>
                  )}
                </div>
              </div>
            )}
            {entry.output === "..." && (
              <div className="mt-1 ml-4 flex items-center gap-1 text-zinc-600">
                <Loader2 size={12} className="animate-spin" />
                <span className="text-xs">{claudeThinking ? "Claude réfléchit..." : "Exécution..."}</span>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2 bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-800 focus-within:border-violet-500/50">
          {claudeCodeMode ? (
            <Bot size={14} className="text-violet-400 flex-shrink-0" />
          ) : (
            <ChevronRight size={14} className="text-emerald-400 flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={claudeCodeMode ? "Décris ce que tu veux faire..." : "Tape une commande..."}
            disabled={running}
            className="flex-1 bg-transparent text-white text-sm font-mono focus:outline-none placeholder:text-zinc-600 disabled:opacity-50"
          />
          {running ? (
            <Loader2 size={14} className="text-violet-400 animate-spin" />
          ) : (
            <button
              onClick={() => execCommand(command)}
              disabled={!command.trim()}
              className="p-1 text-zinc-500 hover:text-emerald-400 disabled:opacity-30 transition-colors"
            >
              <Zap size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
