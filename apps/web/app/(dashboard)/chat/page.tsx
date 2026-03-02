"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatInput, UploadedFile } from "@/components/chat/chat-input";
import { useUser } from "@clerk/nextjs";
import {
  Loader2, CheckCircle, XCircle, ChevronDown, ChevronRight,
  ExternalLink, Key, Search, FileDown, FileText, FileSpreadsheet,
  FileCode, FileImage, File, FileArchive, Plus, Code2, Sparkles, RotateCcw
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
    .replace(/\[DELEGATE:\w+\][\s\S]*?\[\/DELEGATE\]/g, "")
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
  const delOpens = (content.match(/\[DELEGATE:\w+\]/g) || []).length;
  const delCloses = (content.match(/\[\/DELEGATE\]/g) || []).length;
  const artOpens = (content.match(/\[ARTIFACT:[^\]]*\]/g) || []).length;
  const artCloses = (content.match(/\[\/ARTIFACT\]/g) || []).length;
  const backticks = (content.match(/```/g) || []).length;
  return execOpens > execCloses || delOpens > delCloses || artOpens > artCloses || backticks % 2 !== 0;
}

// Strip incomplete blocks from streaming content
function cleanForStreaming(content: string): string {
  let c = content;
  // Remove complete [EXEC] blocks
  c = c.replace(/\[EXEC:\w+\][\s\S]*?\[\/EXEC\]/g, "");
  // Remove complete [DELEGATE] blocks
  c = c.replace(/\[DELEGATE:\w+\][\s\S]*?\[\/DELEGATE\]/g, "");
  // Remove complete [ARTIFACT] blocks
  c = c.replace(/\[ARTIFACT:[^\]]*\][\s\S]*?\[\/ARTIFACT\]/g, "");
  // Remove complete ``` blocks
  c = c.replace(/```\w*\n[\s\S]*?```/g, "");
  // Remove incomplete [EXEC] (open but not closed)
  c = c.replace(/\[EXEC:\w+\][\s\S]*$/g, "");
  // Remove incomplete [DELEGATE]
  c = c.replace(/\[DELEGATE:\w+\][\s\S]*$/g, "");
  // Remove incomplete [ARTIFACT]
  c = c.replace(/\[ARTIFACT:[^\]]*\][\s\S]*$/g, "");
  // Remove incomplete ``` block (odd number of ```)
  const backticks = (c.match(/```/g) || []).length;
  if (backticks % 2 !== 0) {
    const lastIdx = c.lastIndexOf("```");
    c = c.slice(0, lastIdx);
  }
  // Remove other tags
  c = c.replace(/\[MEMORY:[^\]]*\]/g, "").replace(/\[CRON:[^\]]*\]/g, "").replace(/\[FILE:[^\]]*\]/g, "");
  return c.trim();
}

// ── Exec block component ──
function ExecBlockView({ block }: { block: ExecBlock }) {
  const [open, setOpen] = useState(false);
  const isOk = block.status === "done" && block.result && block.result.exitCode === 0;
  const isErr = block.status === "error" || (block.result && block.result.exitCode !== 0);

  return (
    <div className="my-2 rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs hover:bg-white/[0.03] transition-colors">
        {block.status === "running" ? (
          <Loader2 size={13} className="animate-spin text-[#0A84FF]" />
        ) : isOk ? (
          <CheckCircle size={13} className="text-[#30D158]" />
        ) : isErr ? (
          <XCircle size={13} className="text-[#FF453A]" />
        ) : (
          <Code2 size={13} className="text-white/25" />
        )}
        <span className="text-white/45 flex-1 text-left font-medium">
          {block.status === "running" ? "Exécution..." :
           isOk ? `Terminé — ${(block.result?.duration || 0)}ms` :
           isErr ? "Erreur" : "En attente"}
        </span>
        {open ? <ChevronDown size={13} className="text-white/20" /> : <ChevronRight size={13} className="text-white/20" />}
      </button>
      {open && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <pre className="px-3.5 py-2.5 text-[11px] text-white/30 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">{block.code}</pre>
          {block.result && (
            <div className="px-3.5 py-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              {block.result.stdout && <pre className="text-[11px] text-[#30D158]/80 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">{block.result.stdout}</pre>}
              {block.result.stderr && <pre className="text-[11px] text-[#FF453A]/80 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">{block.result.stderr}</pre>}
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
    <div className="my-2 flex items-center gap-3 p-3 rounded-2xl hover:bg-white/[0.03] transition-all"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.05)" }}>{getFileIcon(filename)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white/90 truncate">{filename}</p>
        {error && <p className="text-[10px] text-[#FF453A] mt-0.5">{error}</p>}
      </div>
      <button onClick={download} disabled={downloading}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white disabled:opacity-50 transition-all"
        style={{ background: "rgba(10,132,255,0.15)", border: "1px solid rgba(10,132,255,0.2)" }}>
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
    <div className="my-3 rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
      <div className="flex items-center justify-between px-3.5 py-2.5"
        style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <span className="text-xs font-medium text-white/50">{artifact.title || "Artifact"}</span>
        <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-white/30 hover:text-white/60 transition-colors">
          {expanded ? "Réduire" : "Agrandir"}
        </button>
      </div>
      <iframe ref={iframeRef} sandbox="allow-scripts allow-same-origin"
        className={`w-full border-0 transition-all ${expanded ? "h-[500px]" : "h-[350px]"}`}
        style={{ background: "#0a0a0f" }}
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
    <div className="my-2 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
      <img src={src} alt={filename} className="max-w-full max-h-[400px] object-contain mx-auto" />
    </div>
  );
}

// ── Render clean content ──
// ── Code block component for markdown ``` blocks ──
function CodeBlockView({ lang, code }: { lang: string; code: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-2 rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs hover:bg-white/[0.03] transition-colors">
        <Code2 size={13} className="text-white/25" />
        <span className="text-white/45 flex-1 text-left font-medium">{lang || "Code"}</span>
        {open ? <ChevronDown size={13} className="text-white/20" /> : <ChevronRight size={13} className="text-white/20" />}
      </button>
      {open && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <pre className="px-3.5 py-2.5 text-[11px] text-white/30 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">{code}</pre>
        </div>
      )}
    </div>
  );
}

function renderContent(content: string) {
  const clean = cleanForDisplay(content);
  if (!clean) return null;

  // Split by markdown code blocks ```lang\n...\n```
  const segments: { type: "text" | "code"; lang?: string; content: string }[] = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(clean)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: clean.slice(lastIndex, match.index) });
    }
    segments.push({ type: "code", lang: match[1], content: match[2].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < clean.length) {
    segments.push({ type: "text", content: clean.slice(lastIndex) });
  }

  return (
    <div className="space-y-1 text-[14px] text-white/70 leading-relaxed">
      {segments.map((seg, si) => {
        if (seg.type === "code") {
          return <CodeBlockView key={si} lang={seg.lang || ""} code={seg.content} />;
        }
        return seg.content.split("\n").map((line, i) => {
          let html = line
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white/90 font-medium">$1</strong>')
            .replace(/`([^`]+)`/g, '<code style="padding:2px 6px;background:rgba(255,255,255,0.06);border-radius:6px;font-size:12px;color:rgba(10,132,255,0.8);font-family:monospace">$1</code>')
            .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" style="color:rgba(10,132,255,0.8);text-decoration:none">$1</a>')
            .replace(/(?<!href="|">)(https?:\/\/[^\s<"]+)/g, '<a href="$1" target="_blank" style="color:rgba(10,132,255,0.8);text-decoration:none">$1 ↗</a>');
          return <p key={`${si}-${i}`} className={line === "" ? "h-3" : ""} dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }} />;
        });
      })}
    </div>
  );
}

// ── Streaming indicator (replaces raw code) ──
function StreamingCodeIndicator() {
  return (
    <div className="my-2 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="relative w-4 h-4">
        <div className="absolute inset-0 rounded-full border-2 animate-spin"
          style={{ borderColor: "rgba(10,132,255,0.15)", borderTopColor: "rgba(10,132,255,0.6)" }} />
      </div>
      <span className="text-xs text-white/35 font-medium">Écriture du code...</span>
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
  const [loopActive, setLoopActive] = useState(false);
  const [loopIteration, setLoopIteration] = useState(0);
  const [vpsRebooting, setVpsRebooting] = useState(false);
  const stopRef = useRef(false);
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
  const getOrchestratorMode = (): boolean => { try { return localStorage.getItem("s-rank-orchestrator") === "true"; } catch { return false; } };

  const parseDelegateBlocks = (content: string): { lang: string; brief: string }[] => {
    const blocks: { lang: string; brief: string }[] = [];
    const regex = /\[DELEGATE:(\w+)\]\n?([\s\S]*?)\[\/DELEGATE\]/g;
    let match;
    while ((match = regex.exec(content)) !== null) blocks.push({ lang: match[1], brief: match[2].trim() });
    return blocks;
  };

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
      const data = await res.json();

      // Handle VPS errors (returns {error: "..."} instead of {stdout, stderr, exitCode})
      if (data.error || !res.ok) {
        const errMsg = data.error || `HTTP ${res.status}`;
        pushTask({ id: taskId, name: taskName, status: "error", startedAt: Date.now(), finishedAt: Date.now(), duration: 0, error: errMsg });
        updateStats(false);
        return { ...block, result: { stdout: "", stderr: `Erreur serveur: ${errMsg}`, exitCode: 1, duration: 0 }, status: "error" };
      }

      const result: ExecResult = {
        stdout: data.stdout || data.output || "",
        stderr: data.stderr || "",
        exitCode: typeof data.exitCode === "number" ? data.exitCode : (typeof data.exit_code === "number" ? data.exit_code : (data.error ? 1 : 0)),
        duration: data.duration || 0,
      };
      const ok = result.exitCode === 0;
      pushTask({ id: taskId, name: taskName, status: ok ? "done" : "error", startedAt: Date.now() - (result.duration || 0), finishedAt: Date.now(), duration: result.duration, output: result.stdout?.slice(0,500), error: result.stderr?.slice(0,500) });
      updateStats(ok);
      return { ...block, result, status: ok ? "done" : "error" };
    } catch (err: any) {
      const errMsg = err.message || "Connexion au serveur impossible";
      pushTask({ id: taskId, name: taskName, status: "error", startedAt: Date.now(), finishedAt: Date.now(), duration: 0, error: errMsg });
      updateStats(false);
      return { ...block, result: { stdout: "", stderr: errMsg, exitCode: 1, duration: 0 }, status: "error" };
    }
  };

  const saveApiKey = (key: string) => { setApiKey(key); localStorage.setItem("s-rank-api-key", key); setShowKeyInput(false); addSystemMessage("Clé API configurée ✓"); };

  // ── Format results for Claude context ──
  const formatResultsForClaude = (blocks: ExecBlock[]): string => {
    let out = "RÉSULTATS D'EXÉCUTION:\n\n";
    for (const b of blocks) {
      out += `── [${b.lang.toUpperCase()}] exit code: ${b.result?.exitCode ?? "?"} ──\n`;
      if (b.result?.stdout) out += `STDOUT:\n${b.result.stdout.slice(0, 8000)}\n`;
      if (b.result?.stderr) out += `STDERR:\n${b.result.stderr.slice(0, 3000)}\n`;
      out += "\n";
    }
    out += "Continue en te basant sur ces résultats. Si une erreur s'est produite, corrige et réessaie. Si tout est OK, passe à l'étape suivante ou donne ta réponse finale (sans bloc [EXEC]).";
    return out;
  };

  // ── Stream a single Claude call and return full content ──
  const streamClaudeCall = async (
    content: string,
    history: { role: string; content: any }[],
    msgId: string,
    images?: { base64: string; mediaType: string }[],
  ): Promise<string> => {
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
        orchestratorMode: getOrchestratorMode(),
        userDir: USER_DIR,
        images,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Échec API Claude");
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = "", buffer = "";

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
          const p = JSON.parse(data);
          if (p.type === "content_block_delta" && p.delta?.text) {
            fullContent += p.delta.text;
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m));
          }
        } catch {}
      }
    }

    return fullContent;
  };

  // ── Process special tags (memory, crons) ──
  const processSpecialTags = async (content: string) => {
    // Memory
    const memRegex = /\[MEMORY:([^\]]+)\]/g;
    let memMatch;
    while ((memMatch = memRegex.exec(content)) !== null) {
      try {
        const mem = JSON.parse(localStorage.getItem("s-rank-memory") || '{"facts":[],"style":"","preferences":{}}');
        if (!mem.facts.includes(memMatch[1])) {
          mem.facts.push(memMatch[1]);
          localStorage.setItem("s-rank-memory", JSON.stringify(mem));
        }
      } catch {}
    }
    // Crons
    const cronRegex = /\[CRON:([^|]+)\|([^|]+)\|([^\]]+)\]/g;
    let cronMatch;
    while ((cronMatch = cronRegex.exec(content)) !== null) {
      const [, name, schedule, command] = cronMatch;
      try {
        await fetch("/api/crons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: `cron-${Date.now()}`, name: name.trim(), schedule: schedule.trim(), description: name.trim(), command: command.trim(), enabled: true }),
        });
        addSystemMessage(`Cron créé : "${name.trim()}"`);
      } catch {}
    }
  };

  // ── AGENTIC LOOP — The core brain ──
  const MAX_ITERATIONS = 15;
  const LOOP_TIMEOUT = 300_000; // 5 minutes

  const sendMessage = useCallback(async (content: string, files?: UploadedFile[]) => {
    if (!content.trim() || streaming) return;
    if (!apiKey) { setShowKeyInput(true); return; }

    const loopStart = Date.now();
    stopRef.current = false;

    // Create user message
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content, status: "complete", timestamp: Date.now() };
    const firstAssistantId = `a-${Date.now()}`;
    const firstAssistantMsg: Message = { id: firstAssistantId, role: "assistant", content: "", status: "streaming", timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg, firstAssistantMsg]);
    setStreaming(true);
    setLoopActive(true);
    setLoopIteration(0);

    // Collect images from uploaded files
    const imageData = files?.filter(f => f.base64).map(f => ({
      base64: f.base64!,
      mediaType: f.type || "image/jpeg",
    })) || [];

    // Build initial history from existing messages
    let claudeHistory = messages.filter(m => m.role !== "system").slice(-20).map(m => ({ role: m.role, content: m.content }));
    let currentContent = content;
    let currentMsgId = firstAssistantId;
    let iteration = 0;

    try {
      while (iteration < MAX_ITERATIONS) {
        // ── Safety checks ──
        if (stopRef.current) {
          setMessages(prev => [...prev, {
            id: `sys-stop-${Date.now()}`, role: "system",
            content: "Boucle arrêtée par l'utilisateur", status: "complete", timestamp: Date.now(),
          }]);
          break;
        }
        if (Date.now() - loopStart > LOOP_TIMEOUT) {
          setMessages(prev => [...prev, {
            id: `sys-timeout-${Date.now()}`, role: "system",
            content: "Timeout — boucle arrêtée après 5 minutes", status: "complete", timestamp: Date.now(),
          }]);
          break;
        }

        setLoopIteration(iteration + 1);

        // ── PHASE 1: Call Claude (streaming) ──
        const fullContent = await streamClaudeCall(
          currentContent,
          claudeHistory,
          currentMsgId,
          iteration === 0 ? (imageData.length > 0 ? imageData : undefined) : undefined,
        );

        // Process special tags
        await processSpecialTags(fullContent);

        // Parse exec blocks AND delegate blocks
        const execBlocks = parseExecBlocks(fullContent);
        const delegateBlocks = parseDelegateBlocks(fullContent);

        // ── PHASE 2: No action blocks → response finale, exit loop ──
        if (execBlocks.length === 0 && delegateBlocks.length === 0) {
          setMessages(prev => prev.map(m =>
            m.id === currentMsgId ? { ...m, content: fullContent, status: "complete" } : m
          ));
          break;
        }

        // ── PHASE 3: Handle DELEGATE blocks (orchestrator mode) ──
        let allExecBlocks = [...execBlocks];

        if (delegateBlocks.length > 0) {
          for (const del of delegateBlocks) {
            if (stopRef.current) break;

            // Show delegation indicator
            setMessages(prev => [...prev, {
              id: `delegate-${Date.now()}`, role: "system",
              content: `🤖 Délégation au sub-agent (${del.lang})...`,
              status: "complete", timestamp: Date.now(),
            }]);

            try {
              const delRes = await fetch("/api/chat/delegate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  brief: del.brief,
                  language: del.lang,
                  apiKey,
                }),
              });
              const delData = await delRes.json();

              if (delData.code) {
                // Convert delegate result into an exec block
                allExecBlocks.push({
                  lang: del.lang,
                  code: delData.code,
                  status: "pending",
                });
              } else {
                // Sub-agent failed
                allExecBlocks.push({
                  lang: del.lang,
                  code: `echo "Sub-agent error: ${delData.error || 'no code returned'}"`,
                  status: "pending",
                });
              }
            } catch (err: any) {
              allExecBlocks.push({
                lang: "bash",
                code: `echo "Delegate error: ${err.message}"`,
                status: "pending",
              });
            }
          }
        }

        // ── PHASE 4: Execute blocks ──
        // Mark message as complete with exec blocks
        setMessages(prev => prev.map(m =>
          m.id === currentMsgId ? { ...m, content: fullContent, status: "complete", execBlocks: allExecBlocks.map(b => ({ ...b, status: "pending" as const })) } : m
        ));

        // Execute each block sequentially
        const executedBlocks: ExecBlock[] = [];
        for (let i = 0; i < allExecBlocks.length; i++) {
          if (stopRef.current) break;

          // Set block to running
          setMessages(prev => prev.map(m => {
            if (m.id !== currentMsgId) return m;
            const u = [...(m.execBlocks || [])];
            u[i] = { ...u[i], status: "running" };
            return { ...m, execBlocks: u };
          }));

          const result = await executeBlock(allExecBlocks[i], `${allExecBlocks[i].lang}: ${allExecBlocks[i].code.split("\n")[0].slice(0, 60)}`);
          executedBlocks.push(result);

          // Update block result in UI
          setMessages(prev => prev.map(m => {
            if (m.id !== currentMsgId) return m;
            const u = [...(m.execBlocks || [])];
            u[i] = result;
            return { ...m, execBlocks: u };
          }));
        }

        if (stopRef.current) break;

        // ── PHASE 4: Prepare next iteration ──
        // Add assistant response and execution results to Claude history
        claudeHistory = [
          ...claudeHistory,
          { role: "assistant", content: fullContent },
          { role: "user", content: formatResultsForClaude(executedBlocks) },
        ];

        // Trim history if too long (keep first 2 + last 10)
        if (claudeHistory.length > 30) {
          const first = claudeHistory.slice(0, 2);
          const recent = claudeHistory.slice(-10);
          claudeHistory = [
            ...first,
            { role: "user", content: `[Résumé: ${(claudeHistory.length - 12) / 2} itérations précédentes exécutées. Détails tronqués.]` },
            ...recent,
          ];
        }

        currentContent = formatResultsForClaude(executedBlocks);
        iteration++;

        // ── Create iteration indicator + new assistant message ──
        const nextMsgId = `a-loop-${Date.now()}-${iteration}`;
        setMessages(prev => [
          ...prev,
          { id: `iter-${iteration}`, role: "system", content: `Itération ${iteration + 1}`, status: "complete", timestamp: Date.now() },
          { id: nextMsgId, role: "assistant", content: "", status: "streaming", timestamp: Date.now() },
        ]);
        currentMsgId = nextMsgId;
      }

      // ── Loop finished ──
      if (iteration >= MAX_ITERATIONS) {
        setMessages(prev => [...prev, {
          id: `sys-maxiter-${Date.now()}`, role: "system",
          content: `Limite de ${MAX_ITERATIONS} itérations atteinte`, status: "complete", timestamp: Date.now(),
        }]);
      }

    } catch (err: any) {
      setMessages(prev => prev.map(m =>
        m.id === currentMsgId ? { ...m, content: `Erreur: ${err.message}`, status: "error" } : m
      ));
    } finally {
      setStreaming(false);
      setLoopActive(false);
      setLoopIteration(0);
      stopRef.current = false;
    }
  }, [apiKey, streaming, messages]);

  const clearChat = () => { setMessages([{ id: `w-${Date.now()}`, role: "assistant", content: "Nouveau sujet — que veux-tu faire ?", status: "complete", timestamp: Date.now() }]); };

  const rebootVps = async () => {
    if (vpsRebooting) return;
    let hetznerToken = localStorage.getItem("s-rank-hetzner-token") || "";
    if (!hetznerToken) {
      const input = prompt("Token API Hetzner requis pour reboot.\nVa sur console.hetzner.cloud → Security → API Tokens → Generate\n\nColle ton token ici :");
      if (!input) return;
      hetznerToken = input.trim();
      localStorage.setItem("s-rank-hetzner-token", hetznerToken);
    }
    setVpsRebooting(true);
    addSystemMessage("⚡ Reboot du serveur en cours...");
    try {
      const res = await fetch("/api/vps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", hetznerToken }),
      });
      const data = await res.json();
      if (data.ok) {
        addSystemMessage("✅ Serveur redémarré. Il sera opérationnel dans ~30 secondes.");
        setTimeout(() => setVpsRebooting(false), 30000);
      } else {
        addSystemMessage(`❌ Échec reboot: ${data.error}`);
        if (data.error?.includes("token") || data.error?.includes("401")) localStorage.removeItem("s-rank-hetzner-token");
        setVpsRebooting(false);
      }
    } catch (err: any) {
      addSystemMessage(`❌ Erreur: ${err.message}`);
      setVpsRebooting(false);
    }
  };

  const filtered = searchQuery ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase())) : messages;

  return (
    <div className="flex flex-col h-full" style={{ background: "linear-gradient(180deg, rgba(5,5,15,1) 0%, #000000 100%)" }}>
      {/* Header — Glass bar */}
      <div className="shrink-0 h-12 px-4 flex items-center justify-between"
        style={{
          background: "rgba(10,10,18,0.7)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full" style={{ background: loopActive ? "#0A84FF" : "#30D158", boxShadow: loopActive ? "0 0 8px rgba(10,132,255,0.5)" : "0 0 8px rgba(48,209,88,0.4)", animation: loopActive ? "pulse 1.5s infinite" : "none" }} />
          <span className="text-[13px] font-medium text-white/60">
            {loopActive ? `Itération ${loopIteration}/15` : "S-Rank Agent"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={rebootVps} disabled={vpsRebooting}
            className="p-2 text-white/25 hover:text-[#FF9F0A] rounded-xl transition-colors hover:bg-white/[0.04] disabled:opacity-30"
            title="Reboot serveur">
            <RotateCcw size={15} className={vpsRebooting ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowSearch(!showSearch)} className="p-2 text-white/25 hover:text-white/60 rounded-xl transition-colors hover:bg-white/[0.04]">
            <Search size={15} />
          </button>
          <button onClick={clearChat} className="p-2 text-white/25 hover:text-white/60 rounded-xl transition-colors hover:bg-white/[0.04]">
            <Plus size={15} />
          </button>
          {!apiKey && (
            <button onClick={() => setShowKeyInput(true)} className="p-2 rounded-xl" style={{ color: "#FF9F0A" }}>
              <Key size={15} />
            </button>
          )}
        </div>
      </div>

      {showSearch && (
        <div className="shrink-0 px-4 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Rechercher..."
            autoFocus className="w-full rounded-xl px-3.5 py-2 text-sm text-white/90 focus:outline-none placeholder:text-white/20"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
        </div>
      )}

      {showKeyInput && (
        <div className="shrink-0 mx-4 mt-3 p-4 rounded-2xl"
          style={{
            background: "rgba(20,20,30,0.8)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}>
          <div className="flex items-center gap-2 mb-3">
            <Key size={14} className="text-white/40" />
            <span className="text-sm font-medium text-white/80">Clé API Claude</span>
          </div>
          <p className="text-xs text-white/35 mb-3">
            <a href="https://console.anthropic.com/settings/keys" target="_blank" className="hover:underline inline-flex items-center gap-1" style={{ color: "rgba(10,132,255,0.8)" }}>
              Obtenir ta clé <ExternalLink size={10} />
            </a>
          </p>
          <div className="flex gap-2">
            <input ref={keyInputRef} type="password" placeholder="sk-ant-api03-..."
              className="flex-1 rounded-xl px-3.5 py-2.5 text-sm text-white/90 focus:outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              onKeyDown={e => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value; if (v.startsWith("sk-ant-")) saveApiKey(v); } }} />
            <button onClick={() => { const v = keyInputRef.current?.value || ""; if (v.startsWith("sk-ant-")) saveApiKey(v); }}
              className="px-5 py-2.5 text-sm font-medium text-white rounded-xl transition-all"
              style={{ background: "linear-gradient(135deg, #0A84FF, #5E5CE6)", boxShadow: "0 4px 12px rgba(10,132,255,0.3)" }}>
              OK
            </button>
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
                  <span className={`text-[11px] px-3.5 py-1.5 rounded-full ${msg.id.startsWith("iter-") ? "text-[#0A84FF]/60" : "text-white/25"}`}
                    style={{
                      background: msg.id.startsWith("iter-") ? "rgba(10,132,255,0.06)" : "rgba(255,255,255,0.03)",
                      border: msg.id.startsWith("iter-") ? "1px solid rgba(10,132,255,0.1)" : "1px solid rgba(255,255,255,0.04)",
                    }}>
                    {msg.id.startsWith("iter-") ? `🔄 ${msg.content}` : msg.content}
                  </span>
                </div>
              ) : (
                <div className={`mb-5 ${msg.role === "user" ? "flex justify-end" : ""}`}>
                  {msg.role === "user" ? (
                    <div className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-3"
                      style={{
                        background: "linear-gradient(135deg, rgba(10,132,255,0.2), rgba(94,92,230,0.15))",
                        border: "1px solid rgba(10,132,255,0.15)",
                        backdropFilter: "blur(10px)",
                      }}>
                      <p className="text-[14px] text-white/90 leading-relaxed">{msg.content}</p>
                    </div>
                  ) : (
                    <div className="max-w-full">
                      {msg.status === "streaming" && !msg.content ? (
                        <div className="flex items-center gap-2 py-2">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "rgba(255,255,255,0.25)", animationDelay: "0ms" }} />
                            <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "rgba(255,255,255,0.25)", animationDelay: "150ms" }} />
                            <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "rgba(255,255,255,0.25)", animationDelay: "300ms" }} />
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* During streaming: show clean text + code indicator if writing code */}
                          {msg.status === "streaming" ? (
                            <>
                              {renderContent(cleanForStreaming(msg.content) || " ")}
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
        <ChatInput onSend={sendMessage} disabled={streaming || !apiKey} loopActive={loopActive} onStop={() => { stopRef.current = true; }} />
      </div>
    </div>
  );
}
