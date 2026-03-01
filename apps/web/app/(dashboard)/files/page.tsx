"use client";

import { useState, useEffect, useCallback } from "react";
import { useApi } from "@/lib/hooks/use-api";
import { FilePreview } from "@/components/files/file-preview";

interface FileItem {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified: string;
  extension: string | null;
  permissions?: string;
}

const FILE_ICONS: Record<string, string> = {
  directory: "\u{1F4C1}", md: "\u{1F4DD}", txt: "\u{1F4C4}", ts: "\u{1F7E6}", tsx: "\u269B\uFE0F",
  js: "\u{1F7E8}", py: "\u{1F40D}", json: "\u{1F4CB}", html: "\u{1F310}", css: "\u{1F3A8}",
  png: "\u{1F5BC}\uFE0F", jpg: "\u{1F5BC}\uFE0F", pdf: "\u{1F4D5}", zip: "\u{1F4E6}",
  sh: "\u{1F4DF}", csv: "\u{1F4CA}", default: "\u{1F4C4}",
};

export default function FilesPage() {
  const { get, post, del, loading } = useApi();
  const [currentPath, setCurrentPath] = useState("/home/agent");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  const loadFiles = useCallback(async (path: string) => {
    setError("");
    try {
      const data = await get<{ path: string; files: FileItem[] }>(`/files/list?path=${encodeURIComponent(path)}`);
      setFiles(data.files || []);
      setCurrentPath(path);
      setSelectedFile(null);
      setPreviewContent(null);
    } catch (err: any) {
      setError(err.message || "Impossible de charger les fichiers");
      setFiles([]);
    }
  }, [get]);

  useEffect(() => { loadFiles(currentPath); }, []);

  const openFile = async (file: FileItem) => {
    if (file.type === "directory") {
      loadFiles(file.path);
    } else {
      setSelectedFile(file);
      try {
        const data = await get<{ content: string }>(`/files/read?path=${encodeURIComponent(file.path)}`);
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

  const handleDelete = async () => {
    if (!selectedFile) return;
    if (!confirm(`Supprimer ${selectedFile.name} ?`)) return;
    try {
      await del(`/files/delete?path=${encodeURIComponent(selectedFile.path)}`);
      setSelectedFile(null);
      setPreviewContent(null);
      loadFiles(currentPath);
    } catch (err: any) { setError(err.message); }
  };

  const handleNewFolder = async () => {
    const name = prompt("Nom du dossier :");
    if (!name) return;
    try {
      await post("/files/mkdir", { path: `${currentPath}/${name}` });
      loadFiles(currentPath);
    } catch (err: any) { setError(err.message); }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) { loadFiles(currentPath); return; }
    try {
      const data = await get<{ results: { path: string; name: string }[] }>(`/files/search?q=${encodeURIComponent(searchQuery)}&path=${encodeURIComponent(currentPath)}`);
      setFiles(data.results.map((r) => ({
        name: r.name || r.path.split("/").pop() || "",
        path: r.path,
        type: "file" as const,
        size: 0,
        modified: "",
        extension: r.name?.split(".").pop() || null,
      })));
    } catch { /* ignore */ }
  };

  const getIcon = (file: FileItem) => {
    if (file.type === "directory") return FILE_ICONS.directory;
    return FILE_ICONS[file.extension || ""] || FILE_ICONS.default;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "\u2014";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const breadcrumbs = currentPath.split("/").filter(Boolean);

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-srank-border">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold">Fichiers</h1>
            <div className="flex gap-2">
              <button onClick={handleNewFolder} className="px-3 py-1.5 text-xs bg-srank-card border border-srank-border rounded-lg hover:bg-srank-hover transition-colors">
                {"\u{1F4C1}"} Nouveau dossier
              </button>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs text-srank-text-muted">
            <button onClick={() => loadFiles("/home/agent")} className="hover:text-srank-primary">/</button>
            {breadcrumbs.map((part, i) => (
              <span key={i}>
                <span className="mx-0.5 text-srank-border">/</span>
                <button onClick={() => loadFiles("/" + breadcrumbs.slice(0, i + 1).join("/"))} className="hover:text-srank-primary">{part}</button>
              </span>
            ))}
          </div>

          {/* Search */}
          <div className="flex gap-2 mt-3">
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Rechercher des fichiers..."
              className="flex-1 bg-srank-card border border-srank-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-srank-primary placeholder:text-srank-text-muted" />
            {searchQuery && <button onClick={() => { setSearchQuery(""); loadFiles(currentPath); }} className="text-xs text-srank-text-muted hover:text-srank-primary">Effacer</button>}
          </div>
        </div>

        {error && <div className="px-6 py-2 bg-srank-red/10 text-srank-red text-xs">{error}</div>}

        {/* File grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-srank-text-muted text-sm">Chargement...</div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-srank-text-muted">
              <span className="text-4xl mb-2">{"\u{1F4C2}"}</span>
              <span className="text-sm">Dossier vide</span>
            </div>
          ) : (
            <>
              {currentPath !== "/home/agent" && (
                <button onClick={goUp} className="flex items-center gap-2 p-3 mb-2 rounded-xl hover:bg-srank-hover transition-colors text-xs text-srank-text-muted">
                  {"\u2B06\uFE0F"} Remonter
                </button>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {files.sort((a, b) => a.type !== b.type ? (a.type === "directory" ? -1 : 1) : a.name.localeCompare(b.name)).map((file) => (
                  <button key={file.path || file.name} onClick={() => setSelectedFile(file)} onDoubleClick={() => openFile(file)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:border-srank-primary/30 hover:bg-srank-hover ${
                      selectedFile?.path === file.path ? "border-srank-primary bg-srank-primary/5" : "border-transparent"}`}>
                    <span className="text-4xl">{getIcon(file)}</span>
                    <span className="text-xs text-center truncate w-full">{file.name}</span>
                    <span className="text-[10px] text-srank-text-muted">{formatSize(file.size)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Preview panel */}
      {selectedFile && (
        <div className="w-96 border-l border-srank-border bg-srank-surface flex flex-col">
          {previewContent !== null && selectedFile.type === "file" ? (
            <div className="flex-1 overflow-hidden">
              <FilePreview filename={selectedFile.name} content={previewContent} />
            </div>
          ) : (
            <div className="p-5">
              <div className="text-center mb-6"><span className="text-6xl">{getIcon(selectedFile)}</span></div>
              <h3 className="font-semibold mb-4">{selectedFile.name}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-srank-text-muted">Type</span>
                  <span>{selectedFile.type === "directory" ? "Dossier" : selectedFile.extension?.toUpperCase() || "Fichier"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-srank-text-muted">Taille</span>
                  <span>{formatSize(selectedFile.size)}</span>
                </div>
                {selectedFile.modified && (
                  <div className="flex justify-between">
                    <span className="text-srank-text-muted">Modifi\u00E9</span>
                    <span className="text-xs">{selectedFile.modified}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="p-4 border-t border-srank-border space-y-2">
            <button onClick={() => openFile(selectedFile)} className="w-full px-3 py-2 text-xs bg-srank-primary rounded-lg hover:bg-srank-primary-600 transition-colors text-white">
              {selectedFile.type === "directory" ? "Ouvrir" : "Voir contenu"}
            </button>
            <button onClick={handleDelete} className="w-full px-3 py-2 text-xs text-srank-red bg-srank-card border border-srank-border rounded-lg hover:bg-srank-red/10 transition-colors">
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
