"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChatInput } from "@/components/chat/chat-input";
import {
  Bot, User, Key, Play, Loader2, Terminal, CheckCircle, XCircle,
  Plus, MessageSquare, FolderPlus, Folder, ChevronDown, ChevronRight,
  Trash2, Edit3, MoreHorizontal, PanelLeftClose, PanelLeft, ExternalLink
} from "lucide-react";

// ── Types ──
interface ExecResult { stdout: string; stderr: string; exitCode: number; duration: number; }
interface CodeBlock { lang: string; code: string; result?: ExecResult; running?: boolean; }
interface Message { id: string; role: "user" | "assistant"; content: string; status: "complete" | "streaming" | "error"; codeBlocks?: CodeBlock[]; }
interface Conversation { id: string; title: string; folderId: string | null; messages: Message[]; createdAt: number; updatedAt: number; }
interface ChatFolder { id: string; name: string; open: boolean; }

function detectLang(lang: string): string | null {
  const m: Record<string, string> = { python: "python3", py: "python3", python3: "python3", javascript: "node", js: "node", node: "node", bash: "bash", sh: "bash", shell: "bash" };
  return m[lang.toLowerCase()] || null;
}

function generateId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

// ── Persistence ──
function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("s-rank-chats") || "[]"); } catch { return []; }
}
function saveConversations(convs: Conversation[]) {
  localStorage.setItem("s-rank-chats", JSON.stringify(convs));
}
function loadFolders(): ChatFolder[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("s-rank-chat-folders") || "[]"); } catch { return []; }
}
function saveFolders(folders: ChatFolder[]) {
  localStorage.setItem("s-rank-chat-folders", JSON.stringify(folders));
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [folders, setFolders] = useState<ChatFolder[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  // Load on mount
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("s-rank-api-key") : null;
    if (stored) setApiKey(stored);
    else setShowKeyInput(true);
    setConversations(loadConversations());
    setFolders(loadFolders());
    const lastActive = localStorage.getItem("s-rank-active-chat");
    if (lastActive) setActiveId(lastActive);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeId, conversations]);

  // Active conversation
  const activeConv = conversations.find((c) => c.id === activeId) || null;
  const messages = activeConv?.messages || [];

  // ── Actions ──
  const updateConversations = (updated: Conversation[]) => {
    setConversations(updated);
    saveConversations(updated);
  };

  const updateFolders = (updated: ChatFolder[]) => {
    setFolders(updated);
    saveFolders(updated);
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("s-rank-api-key", key);
    setShowKeyInput(false);
  };

  const newChat = (folderId: string | null = null) => {
    const conv: Conversation = { id: generateId(), title: "Nouveau chat", folderId, messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    updateConversations([conv, ...conversations]);
    setActiveId(conv.id);
    localStorage.setItem("s-rank-active-chat", conv.id);
  };

  const selectChat = (id: string) => {
    setActiveId(id);
    localStorage.setItem("s-rank-active-chat", id);
    setMenuId(null);
    // Close sidebar on mobile
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const deleteChat = (id: string) => {
    const updated = conversations.filter((c) => c.id !== id);
    updateConversations(updated);
    if (activeId === id) { setActiveId(updated[0]?.id || null); }
    setMenuId(null);
  };

  const renameChat = (id: string, title: string) => {
    updateConversations(conversations.map((c) => c.id === id ? { ...c, title } : c));
    setEditingId(null);
  };

  const moveToFolder = (chatId: string, folderId: string | null) => {
    updateConversations(conversations.map((c) => c.id === chatId ? { ...c, folderId } : c));
    setMenuId(null);
  };

  const newFolder = () => {
    const name = prompt("Nom du dossier :");
    if (!name) return;
    updateFolders([...folders, { id: generateId(), name, open: true }]);
  };

  const deleteFolder = (id: string) => {
    updateFolders(folders.filter((f) => f.id !== id));
    updateConversations(conversations.map((c) => c.folderId === id ? { ...c, folderId: null } : c));
  };

  const toggleFolder = (id: string) => {
    updateFolders(folders.map((f) => f.id === id ? { ...f, open: !f.open } : f));
  };

  // ── Code Execution ──
  const executeCode = async (msgId: string, blockIndex: number, code: string, language: string) => {
    const update = (fn: (blocks: CodeBlock[]) => CodeBlock[]) => {
      setConversations((prev) => {
        const updated = prev.map((c) => {
          if (c.id !== activeId) return c;
          return { ...c, messages: c.messages.map((m) => {
            if (m.id !== msgId) return m;
            return { ...m, codeBlocks: fn([...(m.codeBlocks || [])]) };
          })};
        });
        saveConversations(updated);
        return updated;
      });
    };
    update((blocks) => { blocks[blockIndex] = { ...blocks[blockIndex], running: true, result: undefined }; return blocks; });
    try {
      const res = await fetch("/api/exec", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, language }) });
      const result: ExecResult = await res.json();
      update((blocks) => { blocks[blockIndex] = { ...blocks[blockIndex], running: false, result }; return blocks; });
    } catch (err: any) {
      update((blocks) => { blocks[blockIndex] = { ...blocks[blockIndex], running: false, result: { stdout: "", stderr: err.message, exitCode: 1, duration: 0 } }; return blocks; });
    }
  };

  const parseCodeBlocks = (content: string): CodeBlock[] => {
    const blocks: CodeBlock[] = [];
    const regex = /```(\w*)\n([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) blocks.push({ lang: match[1] || "", code: match[2].trim() });
    return blocks;
  };

  // ── Send Message ──
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || streaming) return;
    if (!apiKey) { setShowKeyInput(true); return; }

    // Create new chat if none active
    let convId = activeId;
    if (!convId) {
      const conv: Conversation = { id: generateId(), title: content.slice(0, 40), folderId: null, messages: [], createdAt: Date.now(), updatedAt: Date.now() };
      const updated = [conv, ...conversations];
      setConversations(updated);
      saveConversations(updated);
      convId = conv.id;
      setActiveId(conv.id);
      localStorage.setItem("s-rank-active-chat", conv.id);
    }

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content, status: "complete" };
    const assistantId = `a-${Date.now()}`;
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", status: "streaming" };

    // Update title if first message
    const updateTitle = (convs: Conversation[], cId: string, msg: string) =>
      convs.map((c) => c.id === cId && c.messages.length === 0 ? { ...c, title: msg.slice(0, 50) } : c);

    setConversations((prev) => {
      const updated = updateTitle(prev, convId!, content).map((c) =>
        c.id === convId ? { ...c, messages: [...c.messages, userMsg, assistantMsg], updatedAt: Date.now() } : c
      );
      saveConversations(updated);
      return updated;
    });
    setStreaming(true);

    try {
      const currentConv = conversations.find((c) => c.id === convId);
      const history = (currentConv?.messages || []).filter((m) => m.status === "complete").map((m) => ({ role: m.role, content: m.content }));
      const trustLevel = parseInt(localStorage.getItem("s-rank-trust-level") || "2");
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, apiKey, history, trustLevel }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Erreur" }));
        setConversations((prev) => {
          const updated = prev.map((c) => c.id === convId ? { ...c, messages: c.messages.map((m) => m.id === assistantId ? { ...m, content: err.error || "Erreur API", status: "error" as const } : m) } : c);
          saveConversations(updated);
          return updated;
        });
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
              setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, messages: c.messages.map((m) => m.id === assistantId ? { ...m, content: fullText } : m) } : c));
            }
          } catch {}
        }
      }

      const codeBlocks = parseCodeBlocks(fullText);
      setConversations((prev) => {
        const updated = prev.map((c) => c.id === convId ? { ...c, updatedAt: Date.now(), messages: c.messages.map((m) => m.id === assistantId ? { ...m, content: fullText || "...", status: "complete" as const, codeBlocks } : m) } : c);
        saveConversations(updated);
        return updated;
      });
    } catch (err: any) {
      setConversations((prev) => {
        const updated = prev.map((c) => c.id === convId ? { ...c, messages: c.messages.map((m) => m.id === assistantId ? { ...m, content: err.message || "Erreur", status: "error" as const } : m) } : c);
        saveConversations(updated);
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }, [apiKey, streaming, conversations, activeId]);

  // ── Render code block ──
  const renderContent = (msg: Message) => {
    const { content, codeBlocks } = msg;
    const parts = content.split(/(```[\s\S]*?```)/g);
    let blockIdx = 0;
    return parts.map((part, i) => {
      if (part.startsWith("```")) {
        const lines = part.split("\n");
        const lang = lines[0].replace("```", "").trim();
        const code = lines.slice(1, -1).join("\n");
        const execLang = detectLang(lang);
        const block = codeBlocks?.[blockIdx];
        const idx = blockIdx++;
        return (
          <div key={i} className="my-2 rounded-lg overflow-hidden border border-zinc-700/50">
            <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Terminal size={12} className="text-zinc-500" />
                <span className="text-xs text-zinc-500">{lang || "code"}</span>
              </div>
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
                  <span className="text-xs text-zinc-500">{block.result.exitCode === 0 ? "Succès" : `Erreur (${block.result.exitCode})`} · {block.result.duration}ms</span>
                </div>
                {block.result.stdout && <pre className="text-xs text-zinc-300 bg-zinc-950 rounded p-2 overflow-x-auto mb-1">{block.result.stdout}</pre>}
                {block.result.stderr && <pre className="text-xs text-red-400 bg-red-950/30 rounded p-2 overflow-x-auto">{block.result.stderr}</pre>}
              </div>
            )}
          </div>
        );
      }
      const html = part.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, '<code class="bg-zinc-800 px-1 py-0.5 rounded text-violet-300 text-xs">$1</code>');
      return <span key={i} className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: html }} />;
    });
  };

  // ── Sidebar chat list ──
  const unfolderedChats = conversations.filter((c) => !c.folderId);
  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("fr", { day: "numeric", month: "short" });
  };

  return (
    <div className="flex h-full bg-zinc-950">
      {/* ── Sidebar ── */}
      {sidebarOpen && (
        <div className="w-64 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full absolute md:relative z-20">
          {/* Header */}
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <button onClick={() => newChat()} className="flex items-center gap-2 px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-500 flex-1">
              <Plus size={14} /> Nouveau chat
            </button>
            <button onClick={() => setSidebarOpen(false)} className="p-1 text-zinc-500 hover:text-white ml-2">
              <PanelLeftClose size={16} />
            </button>
          </div>

          {/* Folder + New folder */}
          <div className="p-2 border-b border-zinc-800">
            <button onClick={newFolder} className="flex items-center gap-2 px-2 py-1 text-xs text-zinc-500 hover:text-white w-full rounded hover:bg-zinc-800">
              <FolderPlus size={14} /> Nouveau dossier
            </button>
          </div>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {/* Folders */}
            {folders.map((folder) => {
              const folderChats = conversations.filter((c) => c.folderId === folder.id);
              return (
                <div key={folder.id}>
                  <div className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-white rounded hover:bg-zinc-800 group">
                    <button onClick={() => toggleFolder(folder.id)} className="p-0.5">
                      {folder.open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                    <Folder size={12} className="text-yellow-500" />
                    <span className="flex-1 truncate">{folder.name}</span>
                    <span className="text-[10px] text-zinc-600">{folderChats.length}</span>
                    <button onClick={() => deleteFolder(folder.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-600 hover:text-red-400">
                      <Trash2 size={10} />
                    </button>
                  </div>
                  {folder.open && folderChats.map((conv) => (
                    <ChatItem key={conv.id} conv={conv} active={activeId === conv.id} onClick={() => selectChat(conv.id)}
                      onDelete={() => deleteChat(conv.id)} onRename={(t) => renameChat(conv.id, t)}
                      editing={editingId === conv.id} setEditing={(v) => setEditingId(v ? conv.id : null)}
                      menuOpen={menuId === conv.id} setMenu={(v) => setMenuId(v ? conv.id : null)}
                      folders={folders} onMove={(fId) => moveToFolder(conv.id, fId)}
                      formatDate={formatDate} indent />
                  ))}
                </div>
              );
            })}

            {/* Unfoldered chats */}
            {unfolderedChats.map((conv) => (
              <ChatItem key={conv.id} conv={conv} active={activeId === conv.id} onClick={() => selectChat(conv.id)}
                onDelete={() => deleteChat(conv.id)} onRename={(t) => renameChat(conv.id, t)}
                editing={editingId === conv.id} setEditing={(v) => setEditingId(v ? conv.id : null)}
                menuOpen={menuId === conv.id} setMenu={(v) => setMenuId(v ? conv.id : null)}
                folders={folders} onMove={(fId) => moveToFolder(conv.id, fId)}
                formatDate={formatDate} />
            ))}

            {conversations.length === 0 && (
              <p className="text-xs text-zinc-600 text-center py-8">Aucune conversation</p>
            )}
          </div>
        </div>
      )}

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* API Key Modal */}
        {showKeyInput && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center gap-2 mb-4">
                <Key className="text-violet-400" size={20} />
                <h2 className="text-lg font-semibold text-white">Clé API Claude</h2>
              </div>
              <p className="text-sm text-zinc-400 mb-4">S-Rank utilise ta propre clé API Anthropic (BYOK).</p>
              <input ref={keyInputRef} type="password" placeholder="sk-ant-api..." defaultValue={apiKey}
                className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm mb-4 focus:outline-none focus:border-violet-500"
                onKeyDown={(e) => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value; if (v.startsWith("sk-ant-")) saveApiKey(v); } }} />
              <div className="flex gap-2">
                <button onClick={() => { const v = keyInputRef.current?.value || ""; if (v.startsWith("sk-ant-")) saveApiKey(v); }}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg py-2 text-sm font-medium">Sauvegarder</button>
                {apiKey && <button onClick={() => setShowKeyInput(false)} className="px-4 text-zinc-400 text-sm">Annuler</button>}
              </div>
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer"
                className="block text-xs text-violet-400 mt-3 text-center">Obtenir une clé → console.anthropic.com</a>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 min-h-[44px]">
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="p-1 text-zinc-500 hover:text-white">
              <PanelLeft size={16} />
            </button>
          )}
          <span className="text-sm text-zinc-400 truncate">{activeConv?.title || "S-Rank Agent"}</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <span className="text-6xl mb-4">🏆</span>
              <h2 className="text-xl font-semibold text-white mb-2">S-Rank Agent</h2>
              <p className="text-sm text-zinc-400 text-center max-w-md">Ton PC cloud piloté par l&apos;IA. Demande du code, il s&apos;exécute.</p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {["Écris un script Python qui liste les fichiers", "Montre les infos système", "Crée un serveur HTTP"].map((s) => (
                  <button key={s} onClick={() => sendMessage(s)}
                    className="px-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 text-zinc-400">{s}</button>
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
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" />
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

        {/* Input */}
        <div className="border-t border-zinc-800 p-4">
          <ChatInput onSend={sendMessage} disabled={streaming} />
        </div>
      </div>
    </div>
  );
}

// ── Chat Item Component ──
function ChatItem({ conv, active, onClick, onDelete, onRename, editing, setEditing, menuOpen, setMenu, folders, onMove, formatDate, indent }:
  { conv: Conversation; active: boolean; onClick: () => void; onDelete: () => void; onRename: (t: string) => void;
    editing: boolean; setEditing: (v: boolean) => void; menuOpen: boolean; setMenu: (v: boolean) => void;
    folders: ChatFolder[]; onMove: (fId: string | null) => void; formatDate: (ts: number) => string; indent?: boolean; }) {

  const [editTitle, setEditTitle] = useState(conv.title);

  if (editing) {
    return (
      <div className={`flex gap-1 px-2 py-1 ${indent ? "ml-5" : ""}`}>
        <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus
          className="flex-1 bg-zinc-800 border border-violet-500 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
          onKeyDown={(e) => { if (e.key === "Enter") onRename(editTitle); if (e.key === "Escape") setEditing(false); }}
          onBlur={() => onRename(editTitle)} />
      </div>
    );
  }

  return (
    <div className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs relative ${
      indent ? "ml-5" : ""
    } ${active ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300"}`}
      onClick={onClick}>
      <MessageSquare size={12} className="flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="truncate">{conv.title}</p>
      </div>
      <span className="text-[10px] text-zinc-600 flex-shrink-0">{formatDate(conv.updatedAt)}</span>

      {/* Menu button */}
      <button onClick={(e) => { e.stopPropagation(); setMenu(!menuOpen); }}
        className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-white">
        <MoreHorizontal size={12} />
      </button>

      {/* Dropdown */}
      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-30 py-1"
          onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { setEditing(true); setMenu(false); }}
            className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 flex items-center gap-2">
            <Edit3 size={12} /> Renommer
          </button>
          {folders.length > 0 && (
            <>
              <div className="border-t border-zinc-700 my-1" />
              {folders.map((f) => (
                <button key={f.id} onClick={() => onMove(f.id)}
                  className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 flex items-center gap-2">
                  <Folder size={12} className="text-yellow-500" /> {f.name}
                </button>
              ))}
              {conv.folderId && (
                <button onClick={() => onMove(null)}
                  className="w-full text-left px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 flex items-center gap-2">
                  <Folder size={12} /> Retirer du dossier
                </button>
              )}
            </>
          )}
          <div className="border-t border-zinc-700 my-1" />
          <button onClick={onDelete}
            className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-zinc-700 flex items-center gap-2">
            <Trash2 size={12} /> Supprimer
          </button>
        </div>
      )}
    </div>
  );
}
