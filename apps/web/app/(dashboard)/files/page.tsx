"use client";

import { useState, useEffect, useCallback } from "react";
import { FolderOpen, File, ArrowUp, Search, Plus, Trash2, X, ChevronRight } from "lucide-react";

interface FileItem {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified: string;
  extension: string | null;
}

const EXT_COLORS: Record<string, string> = {
  ts: "text-blue-400", tsx: "text-blue-400", js: "text-yellow-400", jsx: "text-yellow-400",
  py: "text-green-400", html: "text-orange-400", css: "text-pink-400", json: "text-yellow-300",
  md: "text-zinc-300", sh: "text-emerald-400", csv: "text-teal-400", pdf: "text-red-400",
  png: "text-violet-400", jpg: "text-violet-400", svg: "text-violet-400",
};

export default function FilesPage() {
  const [currentPath, setCurrentPath] = useState("/home/agent");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadFiles = useCallback(async (path: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(path)}&t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.error) { setError(data.error); setFiles([]); }
      else { setFiles(data.files || []); }
      setCurrentPath(path);
      setSelectedFile(null);
      setPreviewContent(null);
      setShowPreview(false);
    } catch (err: any) {
      setError("Impossible de charger les fichiers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFiles(currentPath); }, []);

  const openItem = async (file: FileItem) => {
    if (file.type === "directory") {
      loadFiles(file.path);
    } else {
      setSelectedFile(file);
      setShowPreview(true);
      try {
        const res = await fetch(`/api/files/read?path=${encodeURIComponent(file.path)}`);
        const data = await res.json();
        setPreviewContent(data.content);
      } catch {
        setPreviewContent("// Impossible de lire ce fichier");
      }
    }
  };

  const goUp = () => {
    const parts = currentPath.split("/").filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      loadFiles("/" + parts.join("/"));
    }
  };

  const handleNewFolder = async () => {
    const name = prompt("Nom du dossier :");
    if (!name) return;
    const res = await fetch("/api/files/mkdir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: `${currentPath}/${name}` }),
    });
    const data = await res.json();
    console.log("mkdir result:", data);
    await loadFiles(currentPath);
  };

  const handleNewFile = async () => {
    const name = prompt("Nom du fichier (ex: script.py) :");
    if (!name) return;
    const res = await fetch("/api/files/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: `${currentPath}/${name}`, content: "" }),
    });
    const data = await res.json();
    console.log("write result:", data);
    await loadFiles(currentPath);
  };

  const handleDelete = async (file: FileItem) => {
    if (!confirm(`Supprimer ${file.name} ?`)) return;
    await fetch(`/api/files/delete?path=${encodeURIComponent(file.path)}&t=${Date.now()}`, { method: "DELETE" });
    setSelectedFile(null);
    setShowPreview(false);
    await loadFiles(currentPath);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) { loadFiles(currentPath); return; }
    try {
      const res = await fetch(`/api/files/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setFiles(data.results || []);
    } catch {}
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const getExtColor = (file: FileItem) => {
    if (file.type === "directory") return "text-violet-400";
    return EXT_COLORS[file.extension || ""] || "text-zinc-400";
  };

  const breadcrumbs = currentPath.split("/").filter(Boolean);
  const sortedFiles = [...files].sort((a, b) =>
    a.type !== b.type ? (a.type === "directory" ? -1 : 1) : a.name.localeCompare(b.name)
  );

  // Syntax highlighting for preview
  const renderPreview = (content: string, ext: string | null) => {
    return (
      <pre className="text-sm leading-relaxed overflow-auto p-4 h-full">
        <code className={`${EXT_COLORS[ext || ""] || "text-zinc-300"}`}>
          {content}
        </code>
      </pre>
    );
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold text-white">Fichiers</h1>
          <div className="flex gap-2">
            <button
              onClick={handleNewFile}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 text-zinc-300"
            >
              <Plus size={14} /> Fichier
            </button>
            <button
              onClick={handleNewFolder}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 text-zinc-300"
            >
              <FolderOpen size={14} /> Dossier
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-0.5 text-xs text-zinc-500 overflow-x-auto">
          <button onClick={() => loadFiles("/home/agent")} className="hover:text-violet-400 shrink-0">/</button>
          {breadcrumbs.map((part, i) => (
            <span key={i} className="flex items-center shrink-0">
              <ChevronRight size={12} className="mx-0.5 text-zinc-700" />
              <button
                onClick={() => loadFiles("/" + breadcrumbs.slice(0, i + 1).join("/"))}
                className="hover:text-violet-400"
              >
                {part}
              </button>
            </span>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Rechercher..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
            />
          </div>
          {searchQuery && (
            <button onClick={() => { setSearchQuery(""); loadFiles(currentPath); }} className="text-xs text-zinc-500">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-900/20 text-red-400 text-xs">{error}</div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">Chargement...</div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {/* Go up */}
            {currentPath !== "/home/agent" && (
              <button
                onClick={goUp}
                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-zinc-900 transition-colors"
              >
                <ArrowUp size={16} className="text-zinc-500" />
                <span className="text-xs text-zinc-400">..</span>
              </button>
            )}

            {sortedFiles.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-40 text-zinc-600">
                <FolderOpen size={32} className="mb-2" />
                <span className="text-sm">Dossier vide</span>
              </div>
            )}

            {sortedFiles.map((file) => (
              <button
                key={file.path}
                onClick={() => openItem(file)}
                className={`flex items-center gap-3 w-full px-4 py-3 hover:bg-zinc-900 transition-colors text-left ${
                  selectedFile?.path === file.path ? "bg-violet-500/5 border-l-2 border-violet-500" : ""
                }`}
              >
                {file.type === "directory" ? (
                  <FolderOpen size={18} className="text-violet-400 shrink-0" />
                ) : (
                  <File size={18} className={`shrink-0 ${getExtColor(file)}`} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{file.name}</p>
                  <p className="text-xs text-zinc-600">
                    {file.type === "directory" ? "Dossier" : formatSize(file.size)}
                  </p>
                </div>
                {file.type === "directory" && (
                  <ChevronRight size={16} className="text-zinc-700 shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview panel (slides up on mobile) */}
      {showPreview && selectedFile && (
        <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col lg:static lg:w-[400px] lg:border-l lg:border-zinc-800">
          {/* Preview header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
              <p className="text-xs text-zinc-500">
                {selectedFile.extension?.toUpperCase() || "Fichier"} · {formatSize(selectedFile.size)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDelete(selectedFile)}
                className="p-1.5 text-zinc-500 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1.5 text-zinc-500 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Preview content */}
          <div className="flex-1 overflow-auto bg-zinc-900">
            {previewContent === null ? (
              <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">Chargement...</div>
            ) : (
              renderPreview(previewContent, selectedFile.extension)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
