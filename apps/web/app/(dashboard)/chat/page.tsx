"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatInput } from "@/components/chat/chat-input";
import { Bot, User, Key, Play, Loader2, Terminal, CheckCircle, XCircle } from "lucide-react";

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

interface CodeBlock {
  lang: string;
  code: string;
  result?: ExecResult;
  running?: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "complete" | "streaming" | "error";
  codeBlocks?: CodeBlock[];
}

function detectLanguage(lang: string): string | null {
  const map: Record<string, string> = {
    python: "python3", py: "python3", python3: "python3",
    javascript: "node", js: "node", node: "node", nodejs: "node",
    bash: "bash", sh: "bash", shell: "bash", zsh: "bash",
  };
  return map[lang.toLowerCase()] || null;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("s-rank-api-key") : null;
    if (stored) setApiKey(stored);
    else setShowKeyInput(true);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("s-rank-api-key", key);
    setShowKeyInput(false);
  };

  const executeCode = async (msgId: string, blockIndex: number, code: string, language: string) => {
    setMessages((prev) => prev.map((m) => {
      if (m.id !== msgId) return m;
      const blocks = [...(m.codeBlocks || [])];
      blocks[blockIndex] = { ...blocks[blockIndex], running: true, result: undefined };
      return { ...m, codeBlocks: blocks };
    }));

    try {
      const res = await fetch("/api/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });
      const result: ExecResult = await res.json();

      setMessages((prev) => prev.map((m) => {
        if (m.id !== msgId) return m;
        const blocks = [...(m.codeBlocks || [])];
        blocks[blockIndex] = { ...blocks[blockIndex], running: false, result };
        return { ...m, codeBlocks: blocks };
      }));
    } catch (err: any) {
      setMessages((prev) => prev.map((m) => {
        if (m.id !== msgId) return m;
        const blocks = [...(m.codeBlocks || [])];
        blocks[blockIndex] = { ...blocks[blockIndex], running: false, result: { stdout: "", stderr: err.message, exitCode: 1, duration: 0 } };
        return { ...m, codeBlocks: blocks };
      }));
    }
  };

  const parseCodeBlocks = (content: string): CodeBlock[] => {
    const blocks: CodeBlock[] = [];
    const regex = /```(\w*)\n([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      blocks.push({ lang: match[1] || "", code: match[2].trim() });
    }
    return blocks;
  };

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || streaming) return;
    if (!apiKey) { setShowKeyInput(true); return; }

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content, status: "complete" };
    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "", status: "streaming" }]);
    setStreaming(true);

    try {
      const history = messages.filter((m) => m.status === "complete").map((m) => ({ role: m.role, content: m.content }));
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, apiKey, history }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Erreur" }));
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: err.error || "Erreur API", status: "error" as const } : m));
        setStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event:") || !line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") continue;
          try {
            const event = JSON.parse(raw);
            if (event.type === "content_block_delta" && event.delta?.text) {
              fullText += event.delta.text;
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullText } : m));
            }
          } catch {}
        }
      }

      const codeBlocks = parseCodeBlocks(fullText);
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullText || "...", status: "complete" as const, codeBlocks } : m));
    } catch (err: any) {
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: err.message || "Erreur réseau", status: "error" as const } : m));
    } finally {
      setStreaming(false);
    }
  }, [apiKey, streaming, messages]);

  const renderContent = (msg: Message) => {
    const { content, codeBlocks } = msg;
    const parts = content.split(/(```[\s\S]*?```)/g);
    let blockIdx = 0;

    return parts.map((part, i) => {
      if (part.startsWith("```")) {
        const lines = part.split("\n");
        const lang = lines[0].replace("```", "").trim();
        const code = lines.slice(1, -1).join("\n");
        const execLang = detectLanguage(lang);
        const block = codeBlocks?.[blockIdx];
        const currentBlockIdx = blockIdx;
        blockIdx++;

        return (
          <div key={i} className="my-2 rounded-lg overflow-hidden border border-zinc-700/50">
            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Terminal size={12} className="text-zinc-500" />
                <span className="text-xs text-zinc-500">{lang || "code"}</span>
              </div>
              {execLang && msg.status === "complete" && (
                <button
                  onClick={() => executeCode(msg.id, currentBlockIdx, code, execLang)}
                  disabled={block?.running}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors disabled:opacity-50"
                >
                  {block?.running ? (
                    <><Loader2 size={12} className="animate-spin" /> Exécution...</>
                  ) : (
                    <><Play size={12} /> Exécuter</>
                  )}
                </button>
              )}
            </div>
            <pre className="bg-zinc-950 p-3 overflow-x-auto text-sm">
              <code className="text-emerald-400">{code}</code>
            </pre>
            {block?.result && (
              <div className="border-t border-zinc-800 bg-zinc-900 p-3">
                <div className="flex items-center gap-2 mb-2">
                  {block.result.exitCode === 0 ? (
                    <CheckCircle size={14} className="text-emerald-400" />
                  ) : (
                    <XCircle size={14} className="text-red-400" />
                  )}
                  <span className="text-xs text-zinc-500">
                    {block.result.exitCode === 0 ? "Succès" : `Erreur (code ${block.result.exitCode})`}
                    {" · "}{block.result.duration}ms
                  </span>
                </div>
                {block.result.stdout && (
                  <pre className="text-xs text-zinc-300 bg-zinc-950 rounded p-2 overflow-x-auto mb-1">{block.result.stdout}</pre>
                )}
                {block.result.stderr && (
                  <pre className="text-xs text-red-400 bg-red-950/30 rounded p-2 overflow-x-auto">{block.result.stderr}</pre>
                )}
              </div>
            )}
          </div>
        );
      }

      const formatted = part
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code class="bg-zinc-800 px-1 py-0.5 rounded text-violet-300 text-xs">$1</code>');
      return <span key={i} className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {showKeyInput && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-2 mb-4">
              <Key className="text-violet-400" size={20} />
              <h2 className="text-lg font-semibold text-white">Clé API Claude</h2>
            </div>
            <p className="text-sm text-zinc-400 mb-4">
              S-Rank utilise ta propre clé API Anthropic (BYOK). Elle reste dans ton navigateur.
            </p>
            <input
              ref={keyInputRef} type="password" placeholder="sk-ant-api..." defaultValue={apiKey}
              className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm mb-4 focus:outline-none focus:border-violet-500"
              onKeyDown={(e) => { if (e.key === "Enter") { const val = (e.target as HTMLInputElement).value; if (val.startsWith("sk-ant-")) saveApiKey(val); } }}
            />
            <div className="flex gap-2">
              <button onClick={() => { const val = keyInputRef.current?.value || ""; if (val.startsWith("sk-ant-")) saveApiKey(val); }}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg py-2 text-sm font-medium">Sauvegarder</button>
              {apiKey && <button onClick={() => setShowKeyInput(false)} className="px-4 text-zinc-400 hover:text-white text-sm">Annuler</button>}
            </div>
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer"
              className="block text-xs text-violet-400 hover:text-violet-300 mt-3 text-center">Obtenir une clé → console.anthropic.com</a>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <span className="text-6xl mb-4">🏆</span>
            <h2 className="text-xl font-semibold text-white mb-2">S-Rank Agent</h2>
            <p className="text-sm text-zinc-400 text-center max-w-md">Ton PC cloud piloté par l&apos;IA. Demande du code, il s&apos;exécute sur ton serveur.</p>
            <div className="flex flex-wrap gap-2 mt-6 justify-center">
              {["Écris un script Python qui liste les fichiers", "Montre les infos système du serveur", "Crée un serveur HTTP en Node.js"].map((s) => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="px-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 hover:border-violet-500/30 text-zinc-400">{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot size={14} className="text-white" />
              </div>
            )}
            <div className={`max-w-[85%] lg:max-w-[70%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === "user" ? "bg-violet-600 text-white"
                : msg.status === "error" ? "bg-red-900/30 border border-red-800 text-red-300"
                : "bg-zinc-800 text-zinc-100"
            }`}>
              {renderContent(msg)}
              {msg.status === "streaming" && !msg.content && (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 mt-1">
                <User size={14} className="text-white" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-zinc-800 p-4">
        <ChatInput onSend={sendMessage} disabled={streaming} />
      </div>
    </div>
  );
}
