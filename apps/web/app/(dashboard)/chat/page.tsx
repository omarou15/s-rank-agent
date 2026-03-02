"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatInput } from "@/components/chat/chat-input";
import {
  Bot, User, Key, Loader2, CheckCircle, XCircle,
  ChevronDown, ChevronRight, ExternalLink, Settings, Zap, Search
} from "lucide-react";

// ── Types ──
interface ExecResult { stdout: string; stderr: string; exitCode: number; duration: number; }
interface ExecBlock { lang: string; code: string; result?: ExecResult; status: "pending" | "running" | "done" | "error"; }
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  status: "complete" | "streaming" | "error";
  timestamp: number;
  execBlocks?: ExecBlock[];
}

// ── Date separator logic ──
function formatDateSep(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today.getTime() - msgDay.getTime()) / 86400000;
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  if (diff < 7) return d.toLocaleDateString("fr-FR", { weekday: "long" });
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

function needsSeparator(prev: Message | null, curr: Message): boolean {
  if (!prev) return true;
  const pd = new Date(prev.timestamp).toDateString();
  const cd = new Date(curr.timestamp).toDateString();
  return pd !== cd;
}

// ── Exec block component (collapsible) ──
function ExecBlockView({ block }: { block: ExecBlock }) {
  const [open, setOpen] = useState(false);
  const isOk = block.status === "done" && block.result && block.result.exitCode === 0;
  const isErr = block.status === "error" || (block.result && block.result.exitCode !== 0);

  return (
    <div className="my-2 rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-zinc-900 transition-colors">
        {block.status === "running" ? (
          <Loader2 size={12} className="animate-spin text-violet-400" />
        ) : isOk ? (
          <CheckCircle size={12} className="text-emerald-400" />
        ) : isErr ? (
          <XCircle size={12} className="text-red-400" />
        ) : (
          <Zap size={12} className="text-zinc-500" />
        )}
        <span className="text-zinc-400 flex-1 text-left">
          {block.status === "running" ? "Exécution en cours..." :
           isOk ? `✓ Exécuté (${block.lang}) — ${(block.result?.duration || 0)}ms` :
           isErr ? `✗ Erreur (${block.lang})` :
           `Code ${block.lang}`}
        </span>
        {open ? <ChevronDown size={12} className="text-zinc-500" /> : <ChevronRight size={12} className="text-zinc-500" />}
      </button>
      {open && (
        <div className="border-t border-zinc-800">
          <div className="px-3 py-2">
            <p className="text-[10px] text-zinc-600 uppercase mb-1">Code</p>
            <pre className="text-[11px] text-zinc-400 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">{block.code}</pre>
          </div>
          {block.result && (
            <div className="border-t border-zinc-800 px-3 py-2">
              <p className="text-[10px] text-zinc-600 uppercase mb-1">Résultat</p>
              {block.result.stdout && <pre className="text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">{block.result.stdout}</pre>}
              {block.result.stderr && <pre className="text-[11px] text-red-400 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">{block.result.stderr}</pre>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Render message content (strip exec blocks, render markdown-lite) ──
function renderContent(content: string) {
  // Remove [EXEC]...[/EXEC] blocks, [MEMORY:...] tags, and [CRON:...] tags from display
  let clean = content.replace(/\[EXEC:\w+\][\s\S]*?\[\/EXEC\]/g, "").replace(/\[MEMORY:[^\]]*\]/g, "").replace(/\[CRON:[^\]]*\]/g, "").trim();
  if (!clean) return null;

  // Simple markdown: bold, inline code, links
  const parts = clean.split("\n").map((line, i) => {
    let html = line
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-zinc-800 rounded text-violet-300 text-[11px]">$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-violet-400 hover:underline">$1</a>');
    return <p key={i} className={`${line === "" ? "h-2" : ""}`} dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }} />;
  });

  return <div className="space-y-1 text-sm text-zinc-300 leading-relaxed">{parts}</div>;
}

// ── System message (proactive notifications) ──
function SystemMessage({ msg }: { msg: Message }) {
  return (
    <div className="flex justify-center my-2">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/50 border border-zinc-800/50 max-w-[85%]">
        <Zap size={10} className="text-amber-400 shrink-0" />
        <span className="text-[11px] text-zinc-400">{msg.content}</span>
      </div>
    </div>
  );
}

// ── Main Chat Page ──
export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);
  const STORAGE_KEY = "s-rank-chat-messages";

  // ── Warn user if leaving while agent is working ──
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (streaming) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    // Broadcast working state to other pages (sidebar indicator)
    localStorage.setItem("s-rank-agent-working", streaming ? "true" : "false");
    return () => { window.removeEventListener("beforeunload", handleBeforeUnload); };
  }, [streaming]);

  // ── Load state ──
  useEffect(() => {
    const stored = localStorage.getItem("s-rank-api-key");
    if (stored) setApiKey(stored);
    else setShowKeyInput(true);

    // Load messages from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setMessages(parsed);
      } else {
        // Welcome message
        setMessages([{
          id: "welcome",
          role: "assistant",
          content: "Salut ! Je suis ton S-Rank Agent. Mon serveur est prêt — dis-moi ce que tu veux faire et je m'en occupe.",
          status: "complete",
          timestamp: Date.now(),
        }]);
      }
    } catch {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "Salut ! Je suis ton S-Rank Agent. Mon serveur est prêt — dis-moi ce que tu veux faire et je m'en occupe.",
        status: "complete",
        timestamp: Date.now(),
      }]);
    }

    // Listen for config changes from other pages
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "s-rank-config-event" && e.newValue) {
        try {
          const event = JSON.parse(e.newValue);
          addSystemMessage(event.message);
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // ── Persist messages ──
  useEffect(() => {
    if (messages.length > 0 && messages[0]?.id !== "welcome" || messages.length > 1) {
      // Keep last 200 messages
      const toSave = messages.filter(m => m.status === "complete" || m.status === "error").slice(-200);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }
  }, [messages]);

  // ── Auto scroll ──
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Add system notification ──
  const addSystemMessage = (text: string) => {
    setMessages(prev => [...prev, {
      id: `sys-${Date.now()}`,
      role: "system" as const,
      content: text,
      status: "complete" as const,
      timestamp: Date.now(),
    }]);
  };

  // ── Get installed skills ──
  const getInstalledSkills = (): string[] => {
    try {
      const data = localStorage.getItem("s-rank-installed-skills");
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  };

  // ── Get active connectors ──
  const getActiveConnectors = (): string[] => {
    try {
      const data = localStorage.getItem("s-rank-connectors");
      if (!data) return [];
      const connectors = JSON.parse(data);
      return Object.entries(connectors).filter(([, v]) => v).map(([k]) => k);
    } catch { return []; }
  };

  // ── Get trust level ──
  const getTrustLevel = (): number => {
    try { return parseInt(localStorage.getItem("s-rank-trust-level") || "2"); }
    catch { return 2; }
  };

  // ── Get memory context ──
  const getMemoryContext = (): string => {
    try {
      const mem = localStorage.getItem("s-rank-memory");
      if (!mem) return "";
      const data = JSON.parse(mem);
      const parts: string[] = [];
      if (data.facts?.length) parts.push("Faits: " + data.facts.join("; "));
      if (data.style) parts.push("Style préféré: " + data.style);
      return parts.join("\n");
    } catch { return ""; }
  };

  // ── Parse exec blocks from content ──
  const parseExecBlocks = (content: string): ExecBlock[] => {
    const blocks: ExecBlock[] = [];
    const regex = /\[EXEC:(\w+)\]\n?([\s\S]*?)\[\/EXEC\]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      blocks.push({ lang: match[1], code: match[2].trim(), status: "pending" });
    }
    return blocks;
  };

  // ── Push task to Command Center ──
  const pushTask = (task: { id: string; name: string; status: string; startedAt: number; duration?: number; output?: string; error?: string; finishedAt?: number }) => {
    // Update localStorage for Command Center
    try {
      const saved = JSON.parse(localStorage.getItem("s-rank-tasks") || "[]");
      const idx = saved.findIndex((t: any) => t.id === task.id);
      if (idx >= 0) saved[idx] = task;
      else saved.push(task);
      localStorage.setItem("s-rank-tasks", JSON.stringify(saved.slice(-100)));
    } catch {}
    // Broadcast cross-tab
    localStorage.setItem("s-rank-task-event", JSON.stringify({ ...task, _ts: Date.now() }));
  };

  // ── Update daily stats + Agent XP ──
  const updateStats = (success: boolean) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const saved = JSON.parse(localStorage.getItem("s-rank-stats") || "[]");
      const idx = saved.findIndex((s: any) => s.date === today);
      if (idx >= 0) {
        saved[idx].tasks += 1;
        if (success) saved[idx].success += 1;
        else saved[idx].errors += 1;
        saved[idx].tokens += 500;
      } else {
        saved.push({ date: today, tasks: 1, success: success ? 1 : 0, errors: success ? 0 : 1, tokens: 500 });
      }
      localStorage.setItem("s-rank-stats", JSON.stringify(saved.slice(-30)));
    } catch {}
    // Grant XP to agent
    try {
      const agent = JSON.parse(localStorage.getItem("s-rank-agent") || "{}");
      if (agent.xp !== undefined) {
        agent.xp += success ? 10 : 3;
        agent.totalTasks = (agent.totalTasks || 0) + 1;
        localStorage.setItem("s-rank-agent", JSON.stringify(agent));
        localStorage.setItem("s-rank-xp-event", JSON.stringify({ amount: success ? 10 : 3, reason: "task", ts: Date.now() }));
      }
    } catch {}
  };

  // ── Execute a single block ──
  const executeBlock = async (block: ExecBlock, taskName: string): Promise<ExecBlock> => {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    pushTask({ id: taskId, name: taskName, status: "running", startedAt: Date.now() });

    try {
      const res = await fetch("/api/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: block.code, language: block.lang }),
      });
      const result: ExecResult = await res.json();
      const ok = result.exitCode === 0;
      pushTask({ id: taskId, name: taskName, status: ok ? "done" : "error", startedAt: Date.now() - (result.duration || 0), finishedAt: Date.now(), duration: result.duration, output: result.stdout?.slice(0, 500), error: result.stderr?.slice(0, 500) });
      updateStats(ok);
      return { ...block, result, status: ok ? "done" : "error" };
    } catch (err: any) {
      pushTask({ id: taskId, name: taskName, status: "error", startedAt: Date.now(), finishedAt: Date.now(), duration: 0, error: err.message });
      updateStats(false);
      return { ...block, result: { stdout: "", stderr: err.message, exitCode: 1, duration: 0 }, status: "error" };
    }
  };

  // ── Auto-execute all blocks in a message ──
  const autoExecuteBlocks = async (msgId: string, blocks: ExecBlock[]) => {
    for (let i = 0; i < blocks.length; i++) {
      // Set running
      setMessages(prev => prev.map(m => {
        if (m.id !== msgId) return m;
        const updated = [...(m.execBlocks || [])];
        updated[i] = { ...updated[i], status: "running" };
        return { ...m, execBlocks: updated };
      }));

      // Generate task name from first line of code
      const firstLine = blocks[i].code.split("\n")[0].slice(0, 60);
      const taskName = `${blocks[i].lang}: ${firstLine}`;

      const result = await executeBlock(blocks[i], taskName);

      // Set result
      setMessages(prev => prev.map(m => {
        if (m.id !== msgId) return m;
        const updated = [...(m.execBlocks || [])];
        updated[i] = result;
        return { ...m, execBlocks: updated };
      }));
    }
  };

  // ── Save API key ──
  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("s-rank-api-key", key);
    setShowKeyInput(false);
    addSystemMessage("Clé API Claude configurée ✓");
  };

  // ── Send message ──
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || streaming) return;
    if (!apiKey) { setShowKeyInput(true); return; }

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content, status: "complete", timestamp: Date.now() };
    const assistantMsg: Message = { id: `a-${Date.now()}`, role: "assistant", content: "", status: "streaming", timestamp: Date.now() };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    // Build history (last 20 messages for context)
    const recentMsgs = messages.filter(m => m.role !== "system").slice(-20);
    const history = recentMsgs.map(m => ({ role: m.role, content: m.content }));

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
        setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: `Erreur: ${err.error || "Échec API"}`, status: "error" } : m));
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
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

      // Parse exec blocks and auto-execute
      const execBlocks = parseExecBlocks(fullContent);

      // Extract memory
      const memRegex = /\[MEMORY:([^\]]+)\]/g;
      let memMatch;
      while ((memMatch = memRegex.exec(fullContent)) !== null) {
        try {
          const mem = JSON.parse(localStorage.getItem("s-rank-memory") || '{"facts":[],"style":"","preferences":{}}');
          if (!mem.facts.includes(memMatch[1])) { mem.facts.push(memMatch[1]); localStorage.setItem("s-rank-memory", JSON.stringify(mem)); }
        } catch {}
      }

      // Extract and create crons
      const cronRegex = /\[CRON:([^|]+)\|([^|]+)\|([^\]]+)\]/g;
      let cronMatch;
      while ((cronMatch = cronRegex.exec(fullContent)) !== null) {
        const [, name, schedule, command] = cronMatch;
        const newCron = { id: `cron-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, name: name.trim(), schedule: schedule.trim(), description: name.trim(), command: command.trim(), enabled: true };
        try {
          await fetch("/api/crons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newCron) });
          addSystemMessage(`Cron créé : "${name.trim()}" — ${schedule.trim()}`);
        } catch {}
      }

      // Finalize message
      setMessages(prev => prev.map(m =>
        m.id === assistantMsg.id ? { ...m, content: fullContent, status: "complete", execBlocks: execBlocks.length > 0 ? execBlocks : undefined } : m
      ));

      // Auto-execute code blocks
      if (execBlocks.length > 0) {
        await autoExecuteBlocks(assistantMsg.id, execBlocks);
      }

    } catch (err: any) {
      setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: `Erreur réseau: ${err.message}`, status: "error" } : m));
    } finally {
      setStreaming(false);
    }
  }, [apiKey, streaming, messages]);

  // ── Clear chat ──
  const clearChat = () => {
    setMessages([{
      id: "welcome-new",
      role: "assistant",
      content: "Nouveau sujet — je suis prêt. Que veux-tu faire ?",
      status: "complete",
      timestamp: Date.now(),
    }]);
  };

  // ── Filtered messages for search ──
  const filteredMessages = searchQuery
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* ── Header ── */}
      <div className="shrink-0 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-medium text-white">S-Rank Agent</span>
          <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">Niv. {getTrustLevel()}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSearch(!showSearch)} className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-900">
            <Search size={16} />
          </button>
          <button onClick={clearChat} className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-900 text-xs">
            Nouveau sujet
          </button>
          {!apiKey && (
            <button onClick={() => setShowKeyInput(true)} className="p-2 text-amber-400 hover:text-amber-300 rounded-lg hover:bg-zinc-900">
              <Key size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Search bar ── */}
      {showSearch && (
        <div className="shrink-0 px-4 py-2 border-b border-zinc-800">
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans l'historique..." autoFocus
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 placeholder:text-zinc-600" />
        </div>
      )}

      {/* ── API Key modal ── */}
      {showKeyInput && (
        <div className="shrink-0 mx-4 mt-3 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <Key size={14} className="text-violet-400" />
            <span className="text-xs font-semibold text-white">Clé API Claude requise</span>
          </div>
          <p className="text-[11px] text-zinc-500 mb-3">
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline inline-flex items-center gap-0.5">
              Obtenir ta clé <ExternalLink size={9} />
            </a>
          </p>
          <div className="flex gap-2">
            <input ref={keyInputRef} type="password" placeholder="sk-ant-api03-..."
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
              onKeyDown={e => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value; if (v.startsWith("sk-ant-")) saveApiKey(v); } }} />
            <button onClick={() => { const v = keyInputRef.current?.value || ""; if (v.startsWith("sk-ant-")) saveApiKey(v); }}
              className="px-4 py-2 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-500">OK</button>
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {filteredMessages.map((msg, i) => (
          <div key={msg.id}>
            {/* Date separator */}
            {needsSeparator(i > 0 ? filteredMessages[i - 1] : null, msg) && (
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">{formatDateSep(msg.timestamp)}</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>
            )}

            {/* System message (notification) */}
            {msg.role === "system" ? (
              <SystemMessage msg={msg} />
            ) : (
              /* User / Assistant message */
              <div className={`flex gap-2.5 mb-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="shrink-0 w-7 h-7 rounded-full bg-violet-600/20 flex items-center justify-center mt-0.5">
                    <Bot size={14} className="text-violet-400" />
                  </div>
                )}
                <div className={`max-w-[85%] ${msg.role === "user"
                  ? "bg-violet-600 rounded-2xl rounded-br-md px-3.5 py-2.5"
                  : "bg-zinc-900 rounded-2xl rounded-bl-md px-3.5 py-2.5 border border-zinc-800/50"}`}>
                  {msg.status === "streaming" && !msg.content ? (
                    <div className="flex items-center gap-2 py-1">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-xs text-zinc-500">Réflexion...</span>
                    </div>
                  ) : msg.role === "user" ? (
                    <p className="text-sm text-white leading-relaxed">{msg.content}</p>
                  ) : (
                    <>
                      {renderContent(msg.content)}
                      {msg.execBlocks?.map((block, bi) => (
                        <ExecBlockView key={bi} block={block} />
                      ))}
                    </>
                  )}
                  {msg.status === "error" && msg.role === "assistant" && (
                    <p className="text-xs text-red-400 mt-1">⚠ Erreur</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="shrink-0 w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center mt-0.5">
                    <User size={14} className="text-zinc-400" />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 border-t border-zinc-800 bg-zinc-950">
        <ChatInput onSend={sendMessage} disabled={streaming || !apiKey} />
      </div>
    </div>
  );
}
