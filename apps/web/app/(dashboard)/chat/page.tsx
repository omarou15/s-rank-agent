"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatInput } from "@/components/chat/chat-input";
import {
  Bot, User, Key, Play, Loader2, Terminal, CheckCircle, XCircle,
  Plus, MessageSquare, Trash2, FolderPlus, ChevronRight, ChevronDown,
  PanelLeftClose, PanelLeft, Pencil, ExternalLink
} from "lucide-react";

interface ExecResult { stdout: string; stderr: string; exitCode: number; duration: number; }
interface CodeBlock { lang: string; code: string; result?: ExecResult; running?: boolean; }
interface Message { id: string; role: "user" | "assistant"; content: string; status: "complete" | "streaming" | "error"; codeBlocks?: CodeBlock[]; }
interface ConvSummary { id: string; title: string; folderId: string; updatedAt: string; messageCount: number; }
interface Folder { id: string; name: string; }

function detectLang(lang: string): string | null {
  const m: Record<string, string> = { python: "python3", py: "python3", python3: "python3", javascript: "node", js: "node", node: "node", bash: "bash", sh: "bash", shell: "bash" };
  return m[lang.toLowerCase()] || null;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["default"]));
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("s-rank-api-key");
    if (stored) setApiKey(stored);
    else setShowKeyInput(true);
    loadConversations();
    loadFolders();
    // Hide sidebar on mobile by default
    if (window.innerWidth < 768) setShowSidebar(false);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {}
  };

  const loadFolders = async () => {
    try {
      const res = await fetch("/api/folders");
      const data = await res.json();
      setFolders(data.folders || [{ id: "default", name: "Général" }]);
    } catch { setFolders([{ id: "default", name: "Général" }]); }
  };

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages.map((m: any, i: number) => ({
          id: m.id || `${m.role}-${i}`,
          role: m.role,
          content: m.content,
          status: "complete" as const,
          codeBlocks: parseCodeBlocks(m.content),
        })));
        setActiveConvId(id);
        // Close sidebar on mobile
        if (window.innerWidth < 768) setShowSidebar(false);
      }
    } catch {}
  };

  const saveConversation = async (msgs: Message[], convId?: string) => {
    const id = convId || activeConvId || `conv-${Date.now()}`;
    const title = msgs.find(m => m.role === "user")?.content.slice(0, 50) || "Nouveau chat";
    const payload = {
      id,
      title,
      folderId: "default",
      messages: msgs.filter(m => m.status === "complete").map(m => ({ id: m.id, role: m.role, content: m.content })),
    };
    try {
      if (activeConvId) {
        await fetch(`/api/conversations/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await fetch("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        setActiveConvId(id);
      }
      await loadConversations();
    } catch {}
  };

  const deleteConversation = async (id: string) => {
    if (!confirm("Supprimer cette conversation ?")) return;
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (activeConvId === id) { setActiveConvId(null); setMessages([]); }
    await loadConversations();
  };

  const newChat = () => { setActiveConvId(null); setMessages([]); };

  const createFolder = async () => {
    const name = prompt("Nom du dossier :");
    if (!name) return;
    await fetch("/api/folders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: `f-${Date.now()}`, name }) });
    await loadFolders();
  };

  const renameConversation = async (id: string, newTitle: string) => {
    await fetch(`/api/conversations/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle }) });
    setRenamingId(null);
    await loadConversations();
  };

  const saveApiKey = (key: string) => { setApiKey(key); localStorage.setItem("s-rank-api-key", key); setShowKeyInput(false); };

  const executeCode = async (msgId: string, blockIndex: number, code: string, language: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const blocks = [...(m.codeBlocks || [])]; blocks[blockIndex] = { ...blocks[blockIndex], running: true, result: undefined };
      return { ...m, codeBlocks: blocks };
    }));
    try {
      const res = await fetch("/api/exec", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, language }) });
      const result: ExecResult = await res.json();
      setMessages(prev => prev.map(m => {
        if (m.id !== msgId) return m;
        const blocks = [...(m.codeBlocks || [])]; blocks[blockIndex] = { ...blocks[blockIndex], running: false, result };
        return { ...m, codeBlocks: blocks };
      }));
    } catch (err: any) {
      setMessages(prev => prev.map(m => {
        if (m.id !== msgId) return m;
        const blocks = [...(m.codeBlocks || [])]; blocks[blockIndex] = { ...blocks[blockIndex], running: false, result: { stdout: "", stderr: err.message, exitCode: 1, duration: 0 } };
        return { ...m, codeBlocks: blocks };
      }));
    }
  };

  const parseCodeBlocks = (content: string): CodeBlock[] => {
    const blocks: CodeBlock[] = []; const regex = /```(\w*)\n([\s\S]*?)```/g; let match;
    while ((match = regex.exec(content)) !== null) blocks.push({ lang: match[1] || "", code: match[2].trim() });
    return blocks;
  };

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || streaming) return;
    if (!apiKey) { setShowKeyInput(true); return; }

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content, status: "complete" };
    const assistantId = `a-${Date.now()}`;
    const newMsgs = [...messages, userMsg, { id: assistantId, role: "assistant" as const, content: "", status: "streaming" as const }];
    setMessages(newMsgs);
    setStreaming(true);

    try {
      const history = messages.filter(m => m.status === "complete").map(m => ({ role: m.role, content: m.content }));
      const trustLevel = parseInt(localStorage.getItem("s-rank-trust-level") || "2");

      // Fetch memory context
      let memoryContext = "";
      try {
        const memRes = await fetch("/api/memory/prompt");
        const memData = await memRes.json();
        memoryContext = memData.context || "";
      } catch {}

      const response = await fetch("/api/chat/stream", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, apiKey, history, trustLevel, memoryContext }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Erreur" }));
        const errorMsgs = newMsgs.map(m => m.id === assistantId ? { ...m, content: err.error || "Erreur API", status: "error" as const } : m);
        setMessages(errorMsgs);
        setStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let fullText = "", buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("event:") || !line.startsWith("data: ")) continue;
          const raw = line.slice(6); if (raw === "[DONE]") continue;
          try {
            const event = JSON.parse(raw);
            if (event.type === "content_block_delta" && event.delta?.text) {
              fullText += event.delta.text;
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m));
            }
          } catch {}
        }
      }

      const codeBlocks = parseCodeBlocks(fullText);
      const finalMsgs = newMsgs.map(m => m.id === assistantId ? { ...m, content: fullText || "...", status: "complete" as const, codeBlocks } : m);
      setMessages(finalMsgs);

      // Auto-save memory from [MEMORY:...] tags
      const memMatches = fullText.matchAll(/\[MEMORY:([^\]]+)\]/g);
      for (const match of memMatches) {
        fetch("/api/memory/fact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fact: match[1].trim() }) }).catch(() => {});
      }

      // Save conversation
      const convId = activeConvId || `conv-${Date.now()}`;
      if (!activeConvId) setActiveConvId(convId);
      await saveConversation(finalMsgs, convId);
    } catch (err: any) {
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: err.message || "Erreur", status: "error" as const } : m));
    } finally { setStreaming(false); }
  }, [apiKey, streaming, messages, activeConvId]);

  const renderContent = (msg: Message) => {
    const { content, codeBlocks } = msg;
    const parts = content.split(/(```[\s\S]*?```)/g);
    let blockIdx = 0;
    return parts.map((part, i) => {
      if (part.startsWith("```")) {
        const lines = part.split("\n"); const lang = lines[0].replace("```", "").trim();
        const code = lines.slice(1, -1).join("\n"); const execLang = detectLang(lang);
        const block = codeBlocks?.[blockIdx]; const idx = blockIdx; blockIdx++;
        return (
          <div key={i} className="my-2 rounded-lg overflow-hidden border border-zinc-700/50">
            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
              <div className="flex items-center gap-2"><Terminal size={12} className="text-zinc-500" /><span className="text-xs text-zinc-500">{lang || "code"}</span></div>
              {execLang && msg.status === "complete" && (
                <button onClick={() => executeCode(msg.id, idx, code, execLang)} disabled={block?.running}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 disabled:opacity-50">
                  {block?.running ? <><Loader2 size={12} className="animate-spin" /> Exécution...</> : <><Play size={12} /> Exécuter</>}
                </button>
              )}
            </div>
            <pre className="bg-zinc-950 p-3 overflow-x-auto text-sm"><code className="text-emerald-400">{code}</code></pre>
            {block?.result && (
              <div className="border-t border-zinc-800 bg-zinc-900 p-3">
                <div className="flex items-center gap-2 mb-2">
                  {block.result.exitCode === 0 ? <CheckCircle size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-red-400" />}
                  <span className="text-xs text-zinc-500">{block.result.exitCode === 0 ? "Succès" : `Erreur (code ${block.result.exitCode})`} · {block.result.duration}ms</span>
                </div>
                {block.result.stdout && <pre className="text-xs text-zinc-300 bg-zinc-950 rounded p-2 overflow-x-auto mb-1">{block.result.stdout}</pre>}
                {block.result.stderr && <pre className="text-xs text-red-400 bg-red-950/30 rounded p-2 overflow-x-auto">{block.result.stderr}</pre>}
              </div>
            )}
          </div>
        );
      }
      const fmt = part.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code class="bg-zinc-800 px-1 py-0.5 rounded text-violet-300 text-xs">$1</code>');
      return <span key={i} className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: fmt }} />;
    });
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  return (
    <div className="flex h-full bg-zinc-950 relative">
      {/* Sidebar overlay on mobile */}
      {showSidebar && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-30" onClick={() => setShowSidebar(false)} />
      )}

      {/* Sidebar */}
      {showSidebar && (
        <div className="fixed md:static inset-y-0 left-0 z-40 w-64 border-r border-zinc-800 flex flex-col bg-zinc-900 flex-shrink-0">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <button onClick={newChat} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-500 flex-1 justify-center">
              <Plus size={14} /> Nouveau chat
            </button>
            <button onClick={() => setShowSidebar(false)} className="ml-2 p-1 text-zinc-500 hover:text-white">
              <PanelLeftClose size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {folders.map((folder) => {
              const folderConvs = conversations.filter(c => (c.folderId || "default") === folder.id);
              const isExpanded = expandedFolders.has(folder.id);
              return (
                <div key={folder.id}>
                  <button onClick={() => toggleFolder(folder.id)} className="flex items-center gap-1 w-full px-2 py-1 text-xs text-zinc-400 hover:text-white rounded">
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <span className="font-medium">{folder.name}</span>
                    <span className="ml-auto text-[10px] text-zinc-600">{folderConvs.length}</span>
                  </button>
                  {isExpanded && folderConvs.map((conv) => (
                    <div key={conv.id}
                      className={`group flex items-center gap-1 px-3 py-1.5 ml-3 rounded text-xs cursor-pointer ${
                        activeConvId === conv.id ? "bg-violet-600/10 text-violet-400" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      }`}
                      onClick={() => loadConversation(conv.id)}>
                      <MessageSquare size={12} className="flex-shrink-0" />
                      {renamingId === conv.id ? (
                        <input autoFocus defaultValue={conv.title} className="flex-1 bg-transparent border-b border-zinc-600 outline-none text-xs"
                          onBlur={(e) => renameConversation(conv.id, e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") renameConversation(conv.id, (e.target as HTMLInputElement).value); if (e.key === "Escape") setRenamingId(null); }}
                        />
                      ) : (
                        <span className="flex-1 truncate">{conv.title}</span>
                      )}
                      <div className="hidden group-hover:flex items-center gap-0.5">
                        <button onClick={(e) => { e.stopPropagation(); setRenamingId(conv.id); }} className="p-0.5 hover:text-white"><Pencil size={10} /></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }} className="p-0.5 hover:text-red-400"><Trash2 size={10} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="p-2 border-t border-zinc-800">
            <button onClick={createFolder} className="flex items-center gap-1 w-full px-2 py-1.5 text-xs text-zinc-500 hover:text-white rounded hover:bg-zinc-800">
              <FolderPlus size={12} /> Nouveau dossier
            </button>
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* API Key Modal */}
        {showKeyInput && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center gap-2 mb-4"><Key className="text-violet-400" size={20} /><h2 className="text-lg font-semibold text-white">Clé API Claude</h2></div>
              <p className="text-sm text-zinc-400 mb-4">S-Rank utilise ta propre clé API Anthropic (BYOK).</p>
              <input ref={keyInputRef} type="password" placeholder="sk-ant-api..." defaultValue={apiKey}
                className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm mb-4 focus:outline-none focus:border-violet-500"
                onKeyDown={(e) => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value; if (v.startsWith("sk-ant-")) saveApiKey(v); } }} />
              <div className="flex gap-2">
                <button onClick={() => { const v = keyInputRef.current?.value || ""; if (v.startsWith("sk-ant-")) saveApiKey(v); }}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg py-2 text-sm font-medium">Sauvegarder</button>
                {apiKey && <button onClick={() => setShowKeyInput(false)} className="px-4 text-zinc-400 hover:text-white text-sm">Annuler</button>}
              </div>
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-xs text-violet-400 hover:text-violet-300 mt-3">Obtenir une clé <ExternalLink size={10} /></a>
            </div>
          </div>
        )}

        {/* Header */}
        {!showSidebar && (
          <div className="p-2 border-b border-zinc-800 flex items-center gap-2">
            <button onClick={() => setShowSidebar(true)} className="p-1 text-zinc-500 hover:text-white"><PanelLeft size={16} /></button>
            <span className="text-xs text-zinc-500 truncate">{activeConvId ? conversations.find(c => c.id === activeConvId)?.title || "Chat" : "Nouveau chat"}</span>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <span className="text-6xl mb-4">🏆</span>
              <h2 className="text-xl font-semibold text-white mb-2">S-Rank Agent</h2>
              <p className="text-sm text-zinc-400 text-center max-w-md">Ton PC cloud piloté par l&apos;IA. Demande du code, il s&apos;exécute sur ton serveur.</p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {["Écris un script Python qui liste les fichiers", "Montre les infos système", "Crée un serveur HTTP en Node.js"].map(s => (
                  <button key={s} onClick={() => sendMessage(s)}
                    className="px-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 hover:border-violet-500/30 text-zinc-400">{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 mt-1"><Bot size={14} className="text-white" /></div>}
              <div className={`max-w-[85%] lg:max-w-[70%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user" ? "bg-violet-600 text-white" : msg.status === "error" ? "bg-red-900/30 border border-red-800 text-red-300" : "bg-zinc-800 text-zinc-100"
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
              {msg.role === "user" && <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 mt-1"><User size={14} className="text-white" /></div>}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-zinc-800 p-4">
          <ChatInput onSend={sendMessage} disabled={streaming} />
        </div>
      </div>
    </div>
  );
}
