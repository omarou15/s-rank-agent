"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatInput, UploadedFile } from "@/components/chat/chat-input";
import { useUser } from "@clerk/nextjs";
import {
  Loader2, CheckCircle, XCircle, ChevronDown, ChevronRight,
  ExternalLink, Key, Search, FileDown, FileText, FileSpreadsheet,
  FileCode, FileImage, File, FileArchive, Plus, Code2, Sparkles
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

// ── Strip all internal tags from display ──
function cleanForDisplay(content: string): string {
  return content
    .replace(/\[EXEC:\w+\][\s\S]*?\[\/EXEC\]/g, "")
    .replace(/\[ARTIFACT:[^\]]*\][\s\S]*?\[\/ARTIFACT\]/g, "")
    .replace(/\[MEMORY:[^\]]*\]/g, "")
    .replace(/\[CRON:[^\]]*\]/g, "")
    .replace(/\[FILE:[^\]]*\]/g, "")
    .trim();
}

// ── Check if content has active EXEC block being streamed (incomplete) ──
function hasIncompleteExec(content: string): boolean {
  const execOpens = (content.match(/\[EXEC:\w+\]/g) || []).length;
  const execCloses = (content.match(/\[\/EXEC\]/g) || []).length;
  const artOpens = (content.match(/\[ARTIFACT:[^\]]*\]/g) || []).length;
  const artCloses = (content.match(/\[\/ARTIFACT\]/g) || []).length;
  return execOpens > execCloses || artOpens > artCloses;
}

// ── Exec block component ──
function ExecBlockView({ block }: { block: ExecBlock }) {
  const [open, setOpen] = useState(false);
  const isOk = block.status === "done" && block.result && block.result.exitCode === 0;
  const isErr = block.status === "error" || (block.result && block.result.exitCode !== 0);

  return (
    <div className="my-2 rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs hover:bg-white/[0.03] transition-colors">
        {block.status === "running" ? (
          <Loader2 size={13} className="animate-spin text-blue-400" />
        ) : isOk ? (
          <CheckCircle size={13} className="text-green-400" />
        ) : isErr ? (
          <XCircle size={13} className="text-red-400" />
        ) : (
          <Code2 size={13} className="text-zinc-500" />
        )}
        <span className="text-zinc-400 flex-1 text-left font-medium">
          {block.status === "running" ? "Exécution..." :
           isOk ? `Terminé — ${(block.result?.duration || 0)}ms` :
           isErr ? "Erreur" : "En attente"}
        </span>
        {open ? <ChevronDown size={13} className="text-zinc-600" /> : <ChevronRight size={13} className="text-zinc-600" />}
      </button>
      {open && (
        <div className="border-t border-white/5">
          <pre className="px-3.5 py-2.5 text-[11px] text-zinc-500 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">{block.code}</pre>
          {block.result && (
            <div className="border-t border-white/5 px-3.5 py-2.5">
              {block.result.stdout && <pre className="text-[11px] text-green-400/80 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">{block.result.stdout}</pre>}
              {block.result.stderr && <pre className="text-[11px] text-red-400/80 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">{block.result.stderr}</pre>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── File icon ──
function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["png","jpg","jpeg","gif","svg","webp","ico"].includes(ext)) return <FileImage size={16} className="text-pink-400" />;
  if (["csv","xlsx","xls","tsv"].includes(ext)) return <FileSpreadsheet size={16} className="text-green-400" />;
  if (["py","js","ts","tsx","jsx","sh","html","css","json","yaml"].includes(ext)) return <FileCode size={16} className="text-blue-400" />;
  if (["zip","tar","gz","rar","7z"].includes(ext)) return <FileArchive size={16} className="text-amber-400" />;
  if (["pdf"].includes(ext)) return <FileText size={16} className="text-red-400" />;
  if (["doc","docx","txt","md","pptx","ppt"].includes(ext)) return <FileText size={16} className="text-blue-400" />;
  return <File size={16} className="text-zinc-500" />;
}

// ── File card ──
function FileCard({ filepath }: { filepath: string }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const filename = filepath.split("/").pop() || filepath;

  const download = async () => {
    setDownloading(true); setError("");
    try {
      const res = await fetch(`/api/files/download?path=${encodeURIComponent(filepath)}`);
      if (!res.ok) throw new Error("Fichier introuvable");
      const data = await res.json();
      if (data.base64) {
        const byteChars = atob(data.base64);
        const byteArr = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
        const blob = new Blob([byteArr], { type: data.mime || "application/octet-stream" });
        const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
      } else if (data.content !== undefined) {
        const blob = new Blob([data.content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
      }
    } catch (e: any) { setError(e.message); } finally { setDownloading(false); }
  };

  return (
    <div className="my-2 flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">{getFileIcon(filename)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white truncate">{filename}</p>
        {error && <p className="text-[10px] text-red-400 mt-0.5">{error}</p>}
      </div>
      <button onClick={download} disabled={downloading}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-black hover:bg-zinc-200 disabled:opacity-50 transition-colors">
        {downloading ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
        {downloading ? "" : "Télécharger"}
      </button>
    </div>
  );
}

// ── Parse FILE tags ──
function parseFileTags(content: string): string[] {
  const files: string[] = [];
  const regex = /\[FILE:([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) files.push(match[1].trim());
  return files;
}

// ── Parse ARTIFACT tags ──
interface Artifact { title: string; html: string; }
function parseArtifacts(content: string): Artifact[] {
  const artifacts: Artifact[] = [];
  const regex = /\[ARTIFACT:([^\]]*)\]\n?([\s\S]*?)\[\/ARTIFACT\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) artifacts.push({ title: match[1].trim(), html: match[2].trim() });
  return artifacts;
}

// ── Artifact renderer (iframe sandbox) ──
function ArtifactView({ artifact }: { artifact: Artifact }) {
  const [expanded, setExpanded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) { doc.open(); doc.write(artifact.html); doc.close(); }
    }
  }, [artifact.html, expanded]);

  return (
    <div className="my-3 rounded-xl border border-white/10 overflow-hidden bg-[#0a0a0a]">
      <div className="flex items-center justify-between px-3.5 py-2 bg-white/[0.03] border-b border-white/5">
        <span className="text-xs font-medium text-zinc-400">{artifact.title || "Artifact"}</span>
        <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
          {expanded ? "Réduire" : "Agrandir"}
        </button>
      </div>
      <iframe ref={iframeRef} sandbox="allow-scripts allow-same-origin"
        className={`w-full border-0 bg-[#0a0a0a] transition-all ${expanded ? "h-[500px]" : "h-[350px]"}`}
        title={artifact.title} />
    </div>
  );
}

// ── Inline image display (for generated charts/images) ──
function InlineImage({ filepath }: { filepath: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const filename = filepath.split("/").pop() || "";

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/files/download?path=${encodeURIComponent(filepath)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.base64) {
          const ext = filename.split(".").pop()?.toLowerCase() || "png";
          const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
          setSrc(`data:${mime};base64,${data.base64}`);
        }
      } catch {}
    })();
  }, [filepath]);

  if (!src) return null;
  return (
    <div className="my-2 rounded-xl overflow-hidden border border-white/5">
      <img src={src} alt={filename} className="max-w-full max-h-[400px] object-contain mx-auto" />
    </div>
  );
}

// ── Render clean content ──
function renderContent(content: string) {
  const clean = cleanForDisplay(content);
  if (!clean) return null;

  const parts = clean.split("\n").map((line, i) => {
    let html = line
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-medium">$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-white/5 rounded-md text-blue-300 text-[12px] font-mono">$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" class="text-blue-400 hover:underline underline-offset-2">$1</a>')
      .replace(/(?<!href="|">)(https?:\/\/[^\s<"]+)/g, '<a href="$1" target="_blank" class="text-blue-400 hover:underline underline-offset-2">$1 ↗</a>');
    return <p key={i} className={line === "" ? "h-3" : ""} dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }} />;
  });

  return <div className="space-y-1 text-[14px] text-zinc-300 leading-relaxed">{parts}</div>;
}

// ── Streaming indicator (replaces raw code) ──
function StreamingCodeIndicator() {
  return (
    <div className="my-2 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/5">
      <div className="relative w-4 h-4">
        <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 border-t-blue-400 animate-spin" />
      </div>
      <span className="text-xs text-zinc-500 font-medium">Écriture du code...</span>
    </div>
  );
}

// ── Main Chat ──
export default function ChatPage() {
  const { user } = useUser();
  const uid = user?.id || "default";
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);
  const STORAGE_KEY = `s-rank-chat-${uid}`;
  const USER_DIR = `/home/agent/users/${uid}`;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { if (streaming) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", handleBeforeUnload);
    localStorage.setItem("s-rank-agent-working", streaming ? "true" : "false");
    return () => { window.removeEventListener("beforeunload", handleBeforeUnload); };
  }, [streaming]);

  useEffect(() => {
    const stored = localStorage.getItem("s-rank-api-key");
    if (stored) setApiKey(stored); else setShowKeyInput(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
      else setMessages([{ id: "welcome", role: "assistant", content: "Salut ! Je suis ton agent. Dis-moi ce que tu veux, je m'en occupe.", status: "complete", timestamp: Date.now() }]);
    } catch {
      setMessages([{ id: "welcome", role: "assistant", content: "Salut ! Je suis ton agent. Dis-moi ce que tu veux, je m'en occupe.", status: "complete", timestamp: Date.now() }]);
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "s-rank-config-event" && e.newValue) {
        try { addSystemMessage(JSON.parse(e.newValue).message); } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [uid]);

  useEffect(() => {
    if (messages.length > 1 || (messages.length === 1 && messages[0]?.id !== "welcome")) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.filter(m => m.status !== "streaming").slice(-200)));
    }
  }, [messages, STORAGE_KEY]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const addSystemMessage = (text: string) => {
    setMessages(prev => [...prev, { id: `sys-${Date.now()}`, role: "system", content: text, status: "complete", timestamp: Date.now() }]);
  };

  const getInstalledSkills = (): string[] => { try { return JSON.parse(localStorage.getItem("s-rank-installed-skills") || "[]"); } catch { return []; } };
  const getActiveConnectors = (): string[] => { try { const d = localStorage.getItem("s-rank-connectors"); if (!d) return []; return Object.entries(JSON.parse(d)).filter(([,v]) => v).map(([k]) => k); } catch { return []; } };
  const getTrustLevel = (): number => { try { return parseInt(localStorage.getItem("s-rank-trust-level") || "2"); } catch { return 2; } };
  const getMemoryContext = (): string => { try { const m = localStorage.getItem("s-rank-memory"); if (!m) return ""; const d = JSON.parse(m); const p: string[] = []; if (d.facts?.length) p.push("Faits: " + d.facts.join("; ")); if (d.style) p.push("Style: " + d.style); return p.join("\n"); } catch { return ""; } };

  const parseExecBlocks = (content: string): ExecBlock[] => {
    const blocks: ExecBlock[] = [];
    const regex = /\[EXEC:(\w+)\]\n?([\s\S]*?)\[\/EXEC\]/g;
    let match;
    while ((match = regex.exec(content)) !== null) blocks.push({ lang: match[1], code: match[2].trim(), status: "pending" });
    return blocks;
  };

  const pushTask = (task: any) => { try { const s = JSON.parse(localStorage.getItem("s-rank-tasks") || "[]"); const i = s.findIndex((t: any) => t.id === task.id); if (i >= 0) s[i] = task; else s.push(task); localStorage.setItem("s-rank-tasks", JSON.stringify(s.slice(-100))); } catch {} localStorage.setItem("s-rank-task-event", JSON.stringify({ ...task, _ts: Date.now() })); };
  const updateStats = (success: boolean) => { try { const today = new Date().toISOString().slice(0, 10); const s = JSON.parse(localStorage.getItem("s-rank-stats") || "[]"); const i = s.findIndex((x: any) => x.date === today); if (i >= 0) { s[i].tasks += 1; if (success) s[i].success += 1; else s[i].errors += 1; s[i].tokens += 500; } else s.push({ date: today, tasks: 1, success: success ? 1 : 0, errors: success ? 0 : 1, tokens: 500 }); localStorage.setItem("s-rank-stats", JSON.stringify(s.slice(-30))); } catch {} try { const a = JSON.parse(localStorage.getItem("s-rank-agent") || "{}"); if (a.xp !== undefined) { a.xp += success ? 10 : 3; a.totalTasks = (a.totalTasks || 0) + 1; localStorage.setItem("s-rank-agent", JSON.stringify(a)); localStorage.setItem("s-rank-xp-event", JSON.stringify({ amount: success ? 10 : 3, reason: "task", ts: Date.now() })); } } catch {} };

  const executeBlock = async (block: ExecBlock, taskName: string): Promise<ExecBlock> => {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    pushTask({ id: taskId, name: taskName, status: "running", startedAt: Date.now() });
    try {
      const res = await fetch("/api/exec", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: block.code, language: block.lang }) });
      const result: ExecResult = await res.json();
      const ok = result.exitCode === 0;
      pushTask({ id: taskId, name: taskName, status: ok ? "done" : "error", startedAt: Date.now() - (result.duration || 0), finishedAt: Date.now(), duration: result.duration, output: result.stdout?.slice(0,500), error: result.stderr?.slice(0,500) });
      updateStats(ok);
      return { ...block, result, status: ok ? "done" : "error" };
    } catch (err: any) {
      pushTask({ id: taskId, name: taskName, status: "error", startedAt: Date.now(), finishedAt: Date.now(), duration: 0, error: err.message });
      updateStats(false);
      return { ...block, result: { stdout: "", stderr: err.message, exitCode: 1, duration: 0 }, status: "error" };
    }
  };

  const autoExecuteBlocks = async (msgId: string, blocks: ExecBlock[]) => {
    for (let i = 0; i < blocks.length; i++) {
      setMessages(prev => prev.map(m => { if (m.id !== msgId) return m; const u = [...(m.execBlocks || [])]; u[i] = { ...u[i], status: "running" }; return { ...m, execBlocks: u }; }));
      const result = await executeBlock(blocks[i], `${blocks[i].lang}: ${blocks[i].code.split("\n")[0].slice(0,60)}`);
      setMessages(prev => prev.map(m => { if (m.id !== msgId) return m; const u = [...(m.execBlocks || [])]; u[i] = result; return { ...m, execBlocks: u }; }));
    }
  };

  const saveApiKey = (key: string) => { setApiKey(key); localStorage.setItem("s-rank-api-key", key); setShowKeyInput(false); addSystemMessage("Clé API configurée ✓"); };

  const sendMessage = useCallback(async (content: string, files?: UploadedFile[]) => {
    if (!content.trim() || streaming) return;
    if (!apiKey) { setShowKeyInput(true); return; }

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content, status: "complete", timestamp: Date.now() };
    const assistantMsg: Message = { id: `a-${Date.now()}`, role: "assistant", content: "", status: "streaming", timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    const history = messages.filter(m => m.role !== "system").slice(-20).map(m => ({ role: m.role, content: m.content }));

    try {
      // Collect images from uploaded files
      const imageData = files?.filter(f => f.base64).map(f => ({
        base64: f.base64,
        mediaType: f.type || "image/jpeg",
      })) || [];

      const res = await fetch("/api/chat/stream", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, apiKey, history, trustLevel: getTrustLevel(), memoryContext: getMemoryContext(), installedSkills: getInstalledSkills(), activeConnectors: getActiveConnectors(), userDir: USER_DIR, images: imageData.length > 0 ? imageData : undefined }) });
      if (!res.ok) { const err = await res.json(); setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: `Erreur: ${err.error || "Échec"}`, status: "error" } : m)); setStreaming(false); return; }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "", buffer = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try { const p = JSON.parse(data); if (p.type === "content_block_delta" && p.delta?.text) { fullContent += p.delta.text; setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: fullContent } : m)); } } catch {}
        }
      }

      const execBlocks = parseExecBlocks(fullContent);

      // Memory
      const memRegex = /\[MEMORY:([^\]]+)\]/g; let memMatch;
      while ((memMatch = memRegex.exec(fullContent)) !== null) { try { const mem = JSON.parse(localStorage.getItem("s-rank-memory") || '{"facts":[],"style":"","preferences":{}}'); if (!mem.facts.includes(memMatch[1])) { mem.facts.push(memMatch[1]); localStorage.setItem("s-rank-memory", JSON.stringify(mem)); } } catch {} }

      // Crons
      const cronRegex = /\[CRON:([^|]+)\|([^|]+)\|([^\]]+)\]/g; let cronMatch;
      while ((cronMatch = cronRegex.exec(fullContent)) !== null) { const [,name,schedule,command] = cronMatch; try { await fetch("/api/crons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: `cron-${Date.now()}`, name: name.trim(), schedule: schedule.trim(), description: name.trim(), command: command.trim(), enabled: true }) }); addSystemMessage(`Cron créé : "${name.trim()}"`); } catch {} }

      setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: fullContent, status: "complete", execBlocks: execBlocks.length > 0 ? execBlocks : undefined } : m));
      if (execBlocks.length > 0) await autoExecuteBlocks(assistantMsg.id, execBlocks);
    } catch (err: any) {
      setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: `Erreur: ${err.message}`, status: "error" } : m));
    } finally { setStreaming(false); }
  }, [apiKey, streaming, messages]);

  const clearChat = () => { setMessages([{ id: `w-${Date.now()}`, role: "assistant", content: "Nouveau sujet — que veux-tu faire ?", status: "complete", timestamp: Date.now() }]); };

  const filtered = searchQuery ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase())) : messages;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="shrink-0 h-12 border-b border-white/5 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-[13px] font-medium text-zinc-300">S-Rank Agent</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSearch(!showSearch)} className="p-2 text-zinc-600 hover:text-zinc-300 rounded-lg transition-colors">
            <Search size={15} />
          </button>
          <button onClick={clearChat} className="p-2 text-zinc-600 hover:text-zinc-300 rounded-lg transition-colors">
            <Plus size={15} />
          </button>
          {!apiKey && (
            <button onClick={() => setShowKeyInput(true)} className="p-2 text-amber-500 hover:text-amber-400 rounded-lg">
              <Key size={15} />
            </button>
          )}
        </div>
      </div>

      {showSearch && (
        <div className="shrink-0 px-4 py-2 border-b border-white/5">
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Rechercher..."
            autoFocus className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-white/20 placeholder:text-zinc-600" />
        </div>
      )}

      {showKeyInput && (
        <div className="shrink-0 mx-4 mt-3 p-4 bg-[#141414] rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Key size={14} className="text-zinc-400" />
            <span className="text-sm font-medium text-white">Clé API Claude</span>
          </div>
          <p className="text-xs text-zinc-500 mb-3">
            <a href="https://console.anthropic.com/settings/keys" target="_blank" className="text-blue-400 hover:underline inline-flex items-center gap-1">
              Obtenir ta clé <ExternalLink size={10} />
            </a>
          </p>
          <div className="flex gap-2">
            <input ref={keyInputRef} type="password" placeholder="sk-ant-api03-..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white/20"
              onKeyDown={e => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value; if (v.startsWith("sk-ant-")) saveApiKey(v); } }} />
            <button onClick={() => { const v = keyInputRef.current?.value || ""; if (v.startsWith("sk-ant-")) saveApiKey(v); }}
              className="px-5 py-2.5 bg-white text-black text-sm font-medium rounded-xl hover:bg-zinc-200 transition-colors">OK</button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {filtered.map((msg) => (
            <div key={msg.id}>
              {msg.role === "system" ? (
                <div className="flex justify-center my-3">
                  <span className="text-[11px] text-zinc-600 bg-white/[0.03] px-3 py-1 rounded-full">{msg.content}</span>
                </div>
              ) : (
                <div className={`mb-5 ${msg.role === "user" ? "flex justify-end" : ""}`}>
                  {msg.role === "user" ? (
                    <div className="max-w-[80%] bg-[#2a2a2a] rounded-2xl rounded-br-md px-4 py-3">
                      <p className="text-[14px] text-white leading-relaxed">{msg.content}</p>
                    </div>
                  ) : (
                    <div className="max-w-full">
                      {msg.status === "streaming" && !msg.content ? (
                        <div className="flex items-center gap-2 py-2">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* During streaming: show clean text + code indicator if writing code */}
                          {msg.status === "streaming" ? (
                            <>
                              {renderContent(msg.content)}
                              {hasIncompleteExec(msg.content) && <StreamingCodeIndicator />}
                            </>
                          ) : (
                            <>
                              {renderContent(msg.content)}
                              {msg.execBlocks?.map((block, bi) => <ExecBlockView key={bi} block={block} />)}
                              {parseArtifacts(msg.content).map((art, ai) => <ArtifactView key={ai} artifact={art} />)}
                              {parseFileTags(msg.content).map((fp, fi) => {
                                const ext = fp.split(".").pop()?.toLowerCase() || "";
                                const isImage = ["png","jpg","jpeg","gif","svg","webp"].includes(ext);
                                return isImage
                                  ? <InlineImage key={fi} filepath={fp} />
                                  : <FileCard key={fi} filepath={fp} />;
                              })}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 max-w-2xl mx-auto w-full">
        <ChatInput onSend={sendMessage} disabled={streaming || !apiKey} />
      </div>
    </div>
  );
}
