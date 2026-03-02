"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatInput } from "@/components/chat/chat-input";
import {
  Bot, User, Key, Loader2, CheckCircle, XCircle, ChevronDown, ChevronRight,
  Terminal, ExternalLink, Zap, Bell
} from "lucide-react";

// ── Types ──
interface ExecResult { stdout: string; stderr: string; exitCode: number; duration: number; }
interface ExecBlock { lang: string; code: string; result?: ExecResult; running?: boolean; }
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  status: "complete" | "streaming" | "error";
  execBlocks?: ExecBlock[];
  timestamp: number;
  isProactive?: boolean;
}

// ── Date helpers ──
function formatDateSeparator(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (msgDay.getTime() === today.getTime()) return "Aujourd'hui";
  if (msgDay.getTime() === yesterday.getTime()) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function shouldShowDateSeparator(msgs: Message[], index: number): boolean {
  if (index === 0) return true;
  const prev = msgs[index - 1];
  const curr = msgs[index];
  const prevDay = new Date(prev.timestamp).toDateString();
  const currDay = new Date(curr.timestamp).toDateString();
  return prevDay !== currDay;
}

// ── Auto-exec parser ──
function parseExecBlocks(content: string): { cleanContent: string; blocks: ExecBlock[] } {
  const blocks: ExecBlock[] = [];
  const regex = /\[EXEC:(\w+)\]\n([\s\S]*?)\[\/EXEC\]/g;
  let match;
  let cleanContent = content;
  while ((match = regex.exec(content)) !== null) {
    blocks.push({ lang: match[1], code: match[2].trim() });
    cleanContent = cleanContent.replace(match[0], `<!--exec-${blocks.length - 1}-->`);
  }
  return { cleanContent, blocks };
}

// ── Exec result component ──
function ExecResultView({ block, index }: { block: ExecBlock; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const success = block.result && block.result.exitCode === 0;

  return (
    <div className="my-2 rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-zinc-900 transition-colors">
        {block.running ? (
          <><Loader2 size={12} className="animate-spin text-violet-400" /><span className="text-zinc-400">Exécution en cours...</span></>
        ) : block.result ? (
          <>
            {success ? <CheckCircle size={12} className="text-emerald-400" /> : <XCircle size={12} className="text-red-400" />}
            <span className={success ? "text-emerald-400" : "text-red-400"}>
              {success ? "✓ Exécuté" : "✗ Erreur"} — {block.result.duration}ms
            </span>
            {expanded ? <ChevronDown size={12} className="ml-auto text-zinc-500" /> : <ChevronRight size={12} className="ml-auto text-zinc-500" />}
          </>
        ) : (
          <><Terminal size={12} className="text-zinc-500" /><span className="text-zinc-500">En attente...</span></>
        )}
      </button>
      {expanded && block.result && (
        <div className="border-t border-zinc-800">
          <div className="px-3 py-1 text-[10px] text-zinc-600 bg-zinc-900/50 flex items-center gap-2">
            <Terminal size={10} /> {block.lang} • {block.code.split("\n").length} lignes
          </div>
          <pre className="px-3 py-2 text-xs text-zinc-400 overflow-x-auto max-h-40 overflow-y-auto font-mono">{block.code}</pre>
          {block.result.stdout && (
            <div className="border-t border-zinc-800">
              <div className="px-3 py-1 text-[10px] text-emerald-600 bg-zinc-900/50">stdout</div>
              <pre className="px-3 py-2 text-xs text-emerald-300 overflow-x-auto max-h-40 overflow-y-auto font-mono">{block.result.stdout}</pre>
            </div>
          )}
          {block.result.stderr && (
            <div className="border-t border-zinc-800">
              <div className="px-3 py-1 text-[10px] text-red-600 bg-zinc-900/50">stderr</div>
              <pre className="px-3 py-2 text-xs text-red-300 overflow-x-auto max-h-40 overflow-y-auto font-mono">{block.result.stderr}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Render message content ──
function renderContent(content: string, execBlocks?: ExecBlock[]) {
  if (!execBlocks || execBlocks.length === 0) {
    // Render markdown-light: bold, inline code, links
    return <div className="whitespace-pre-wrap break-words">{renderMarkdown(content)}</div>;
  }

  // Split content at exec placeholders
  const parts = content.split(/<!--exec-(\d+)-->/);
  return (
    <div className="whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          const idx = parseInt(part);
          return <ExecResultView key={`exec-${idx}`} block={execBlocks[idx]} index={idx} />;
        }
        return <span key={i}>{renderMarkdown(part)}</span>;
      })}
    </div>
  );
}

function renderMarkdown(text: string) {
  // Simple markdown: **bold**, `code`, [link](url), ### headers
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("### ")) return <div key={i} className="font-semibold text-white mt-2 mb-1">{line.slice(4)}</div>;
    if (line.startsWith("## ")) return <div key={i} className="font-semibold text-white text-sm mt-2 mb-1">{line.slice(3)}</div>;
    if (line.startsWith("# ")) return <div key={i} className="font-bold text-white mt-2 mb-1">{line.slice(2)}</div>;
    if (line.startsWith("- ") || line.startsWith("• ")) return <div key={i} className="pl-3">• {inlineFormat(line.slice(2))}</div>;

    // Inline formatting
    return <div key={i}>{inlineFormat(line)}{i < lines.length - 1 ? "" : ""}</div>;
  });
}

function inlineFormat(text: string) {
  // Replace **bold**, `code`, [text](url)
  const parts: (string | JSX.Element)[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
    // Inline code
    const codeMatch = remaining.match(/`(.*?)`/);
    // Link
    const linkMatch = remaining.match(/\[(.*?)\]\((.*?)\)/);

    const matches = [
      boldMatch ? { type: "bold", index: boldMatch.index!, match: boldMatch } : null,
      codeMatch ? { type: "code", index: codeMatch.index!, match: codeMatch } : null,
      linkMatch ? { type: "link", index: linkMatch.index!, match: linkMatch } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = matches[0]!;
    if (first.index > 0) parts.push(remaining.slice(0, first.index));

    if (first.type === "bold") {
      parts.push(<strong key={key++} className="font-semibold text-white">{first.match[1]}</strong>);
      remaining = remaining.slice(first.index + first.match[0].length);
    } else if (first.type === "code") {
      parts.push(<code key={key++} className="px-1 py-0.5 bg-zinc-800 rounded text-violet-300 text-[11px] font-mono">{first.match[1]}</code>);
      remaining = remaining.slice(first.index + first.match[0].length);
    } else if (first.type === "link") {
      parts.push(<a key={key++} href={first.match[2]} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">{first.match[1]}</a>);
      remaining = remaining.slice(first.index + first.match[0].length);
    }
  }

  return <>{parts}</>;
}

// ── Main Chat Page ──
export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  // Load state
  useEffect(() => {
    const stored = localStorage.getItem("s-rank-api-key");
    if (stored) setApiKey(stored);
    else setShowKeyInput(true);

    // Load chat history
    const savedMsgs = localStorage.getItem("s-rank-chat-history");
    if (savedMsgs) {
      try {
        const parsed = JSON.parse(savedMsgs);
        setMessages(parsed);
      } catch {}
    }

    // Check for proactive events
    checkProactiveEvents();

    // Listen for config changes from other pages
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "s-rank-event") {
        try {
          const event = JSON.parse(e.newValue || "");
          handleProactiveEvent(event);
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    // Poll for events
    const interval = setInterval(checkProactiveEvents, 3000);

    return () => { window.removeEventListener("storage", handleStorage); clearInterval(interval); };
  }, []);

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Persist messages
  useEffect(() => {
    if (messages.length > 0) {
      const toSave = messages.filter(m => m.status === "complete").slice(-200);
      localStorage.setItem("s-rank-chat-history", JSON.stringify(toSave));
    }
  }, [messages]);

  // Check for proactive events from other pages
  const checkProactiveEvents = () => {
    const event = localStorage.getItem("s-rank-pending-event");
    if (event) {
      try {
        const parsed = JSON.parse(event);
        handleProactiveEvent(parsed);
        localStorage.removeItem("s-rank-pending-event");
      } catch {}
    }
  };

  const handleProactiveEvent = (event: { type: string; message: string; importance: "high" | "low" }) => {
    if (event.importance === "high") {
      // Full message in chat
      const msg: Message = {
        id: `sys-${Date.now()}`,
        role: "assistant",
        content: event.message,
        status: "complete",
        timestamp: Date.now(),
        isProactive: true,
      };
      setMessages(prev => [...prev, msg]);
    }
    // Low importance → badge handled in notification system
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("s-rank-api-key", key);
    setShowKeyInput(false);
  };

  // Get installed skills
  const getInstalledSkills = (): string[] => {
    try {
      const data = localStorage.getItem("s-rank-installed-skills");
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  };

  // Get active connectors
  const getActiveConnectors = (): string[] => {
    try {
      const data = localStorage.getItem("s-rank-active-connectors");
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  };

  // Get trust level
  const getTrustLevel = (): number => {
    try { return parseInt(localStorage.getItem("s-rank-trust-level") || "2"); }
    catch { return 2; }
  };

  // Get memory context
  const getMemoryContext = (): string => {
    try {
      const mem = localStorage.getItem("s-rank-memory");
      if (!mem) return "";
      const parsed = JSON.parse(mem);
      const parts = [];
      if (parsed.facts?.length) parts.push("Faits: " + parsed.facts.join(". "));
      if (parsed.style) parts.push("Style: " + parsed.style);
      return parts.join("\n");
    } catch { return ""; }
  };

  // Execute code block automatically
  const autoExec = async (lang: string, code: string): Promise<ExecResult> => {
    try {
      const res = await fetch("/api/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language: lang }),
      });
      return await res.json();
    } catch (err: any) {
      return { stdout: "", stderr: err.message, exitCode: 1, duration: 0 };
    }
  };

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || streaming) return;
    if (!apiKey) { setShowKeyInput(true); return; }

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content, status: "complete", timestamp: Date.now() };
    const assistantMsg: Message = { id: `a-${Date.now()}`, role: "assistant", content: "", status: "streaming", timestamp: Date.now() };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    const history = messages.filter(m => m.role !== "system" && m.status === "complete").slice(-20).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          apiKey,
          history,
          trustLevel: getTrustLevel(),
          memoryContext: getMemoryContext(),
          installedSkills: getInstalledSkills(),
          activeConnectors: getActiveConnectors(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: `Erreur: ${err.error}`, status: "error" } : m));
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter(l => l.startsWith("data: "));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                fullContent += parsed.delta.text;
                setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: fullContent } : m));
              }
            } catch {}
          }
        }
      }

      // Process [EXEC] blocks and auto-execute
      const { cleanContent, blocks } = parseExecBlocks(fullContent);

      if (blocks.length > 0) {
        // Set blocks as running
        const execBlocks = blocks.map(b => ({ ...b, running: true }));
        setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: cleanContent, execBlocks, status: "complete" } : m));

        // Execute each block
        for (let i = 0; i < blocks.length; i++) {
          const result = await autoExec(blocks[i].lang, blocks[i].code);
          setMessages(prev => prev.map(m => {
            if (m.id !== assistantMsg.id) return m;
            const updated = [...(m.execBlocks || [])];
            updated[i] = { ...updated[i], running: false, result };
            return { ...m, execBlocks: updated };
          }));
        }
      } else {
        setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: fullContent, status: "complete" } : m));
      }

      // Extract memory
      const memRegex = /\[MEMORY:(.*?)\]/g;
      let memMatch;
      while ((memMatch = memRegex.exec(fullContent)) !== null) {
        try {
          const mem = JSON.parse(localStorage.getItem("s-rank-memory") || '{"facts":[],"style":""}');
          if (!mem.facts.includes(memMatch[1])) {
            mem.facts.push(memMatch[1]);
            localStorage.setItem("s-rank-memory", JSON.stringify(mem));
          }
        } catch {}
      }

    } catch (err: any) {
      setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: `Erreur réseau: ${err.message}`, status: "error" } : m));
    } finally {
      setStreaming(false);
    }
  }, [apiKey, streaming, messages]);

  // Welcome message
  const showWelcome = messages.length === 0;

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="flex-none px-4 py-3 border-b border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-medium text-white">S-Rank Agent</span>
          <span className="text-[10px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full">
            Niveau {getTrustLevel()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!apiKey && (
            <button onClick={() => setShowKeyInput(true)} className="text-xs text-violet-400 flex items-center gap-1">
              <Key size={12} /> Clé API
            </button>
          )}
          {getInstalledSkills().length > 0 && (
            <span className="text-[10px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Zap size={8} className="text-amber-400" /> {getInstalledSkills().length} skills
            </span>
          )}
        </div>
      </div>

      {/* API Key modal */}
      {showKeyInput && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-sm border border-zinc-800">
            <h3 className="text-sm font-semibold text-white mb-2">Clé API Claude</h3>
            <p className="text-xs text-zinc-500 mb-4">
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 inline-flex items-center gap-0.5">
                Obtenir ta clé <ExternalLink size={10} />
              </a>
            </p>
            <input ref={keyInputRef} type="password" placeholder="sk-ant-api03-..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 mb-3"
              onKeyDown={(e) => { if (e.key === "Enter") saveApiKey((e.target as HTMLInputElement).value); }} />
            <div className="flex gap-2">
              <button onClick={() => { if (keyInputRef.current) saveApiKey(keyInputRef.current.value); }}
                className="flex-1 py-2.5 text-sm bg-violet-600 text-white rounded-xl hover:bg-violet-500">Sauvegarder</button>
              {apiKey && <button onClick={() => setShowKeyInput(false)} className="px-4 py-2.5 text-sm text-zinc-400 hover:text-white">Fermer</button>}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {showWelcome && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-4xl mb-4">🏆</div>
            <h2 className="text-lg font-semibold text-white mb-2">S-Rank Agent</h2>
            <p className="text-sm text-zinc-400 mb-6 max-w-sm">
              Ton PC cloud piloté par l&apos;IA. Demande, j&apos;exécute.
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {[
                { icon: "🚀", text: "Crée-moi un site web" },
                { icon: "📊", text: "Analyse ce fichier CSV" },
                { icon: "🔍", text: "Scrape les prix de ce site" },
                { icon: "📧", text: "Envoie un email à mon client" },
              ].map((s, i) => (
                <button key={i} onClick={() => sendMessage(s.text)}
                  className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-violet-500/30 text-left transition-all">
                  <span className="text-lg">{s.icon}</span>
                  <p className="text-xs text-zinc-300 mt-1">{s.text}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={msg.id}>
            {/* Date separator */}
            {shouldShowDateSeparator(messages, index) && (
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{formatDateSeparator(msg.timestamp)}</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>
            )}

            {/* Message */}
            <div className={`flex gap-3 mb-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role !== "user" && (
                <div className={`w-7 h-7 rounded-full flex-none flex items-center justify-center mt-0.5 ${msg.isProactive ? "bg-amber-500/10" : "bg-violet-500/10"}`}>
                  {msg.isProactive ? <Bell size={13} className="text-amber-400" /> : <Bot size={13} className="text-violet-400" />}
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-violet-600 text-white rounded-br-md"
                  : msg.isProactive
                    ? "bg-amber-500/5 border border-amber-500/20 text-zinc-300 rounded-bl-md"
                    : "bg-zinc-900 text-zinc-300 rounded-bl-md"
              } ${msg.status === "error" ? "border border-red-500/30" : ""}`}>
                {msg.status === "streaming" && !msg.content ? (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-zinc-500">Réflexion...</span>
                  </div>
                ) : (
                  renderContent(msg.content, msg.execBlocks)
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full flex-none flex items-center justify-center bg-zinc-800 mt-0.5">
                  <User size={13} className="text-zinc-400" />
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input — fixed bottom, one-hand friendly */}
      <div className="flex-none p-3 pb-[env(safe-area-inset-bottom,12px)]">
        <ChatInput onSend={sendMessage} disabled={streaming} />
      </div>
    </div>
  );
}
