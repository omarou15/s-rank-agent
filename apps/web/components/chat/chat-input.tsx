"use client";
import { useState, useRef, useEffect } from "react";
import { ArrowUp, Paperclip, X, FileText, Image, FileCode, Loader2 } from "lucide-react";

interface UploadedFile { name: string; size: number; path: string; type: string; }
interface ChatInputProps { onSend: (message: string, files?: UploadedFile[]) => void; disabled?: boolean; placeholder?: string; }

function getCat(n: string) { const e = n.split(".").pop()?.toLowerCase() || ""; if (["png","jpg","jpeg","gif","svg","webp"].includes(e)) return "image"; if (["ts","tsx","js","jsx","py","sh","html","css","json","md","csv","sql"].includes(e)) return "code"; return "default"; }
function fmtSize(b: number) { if (b < 1024) return b + " B"; if (b < 1048576) return (b/1024).toFixed(1) + " KB"; return (b/1048576).toFixed(1) + " MB"; }
const ICONS: Record<string, any> = { image: Image, code: FileCode, default: FileText };

export function ChatInput({ onSend, disabled, placeholder = "Demande quelque chose..." }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (taRef.current) { taRef.current.style.height = "auto"; taRef.current.style.height = Math.min(taRef.current.scrollHeight, 160) + "px"; } }, [value]);

  const doSend = () => {
    if ((!value.trim() && files.length === 0) || disabled) return;
    const msg = files.length > 0
      ? `${value.trim() || "Analyse ces fichiers"}\n\n[Fichiers: ${files.map(f => `${f.name} → ${f.path}`).join(", ")}]`
      : value.trim();
    onSend(msg, files);
    setValue(""); setFiles([]);
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const b64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(",")[1] || ""); r.onerror = rej; r.readAsDataURL(file); });
      const path = `/home/agent/uploads/${file.name}`;
      const r = await fetch("/api/files", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path, content: b64, encoding: "base64" }) });
      if (r.ok) setFiles(p => [...p, { name: file.name, size: file.size, path, type: file.type }]);
    } catch {} finally { setUploading(false); }
  };

  const hasContent = value.trim().length > 0 || files.length > 0;

  return (
    <div className="px-4 py-3">
      <div className={`relative rounded-2xl border transition-all duration-200 ${dragOver ? "border-white/30 bg-white/5" : "border-white/10 bg-[#1a1a1a]"}`}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); Array.from(e.dataTransfer.files).forEach(upload); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}>

        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-3">
            {files.map((f, i) => { const I = ICONS[getCat(f.name)]; return (
              <div key={i} className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2.5 py-1.5">
                <I size={12} className="text-zinc-400" />
                <span className="text-xs text-zinc-300 max-w-[120px] truncate">{f.name}</span>
                <span className="text-[10px] text-zinc-600">{fmtSize(f.size)}</span>
                <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-zinc-300 ml-0.5"><X size={12} /></button>
              </div>
            ); })}
          </div>
        )}

        <div className="flex items-end gap-2 p-3">
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors disabled:opacity-30">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
          </button>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { if (e.target.files) Array.from(e.target.files).forEach(upload); e.target.value = ""; }} />

          <textarea ref={taRef} value={value} onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(); } }}
            placeholder={uploading ? "Upload en cours..." : dragOver ? "Dépose ici..." : placeholder}
            disabled={disabled || uploading} rows={1}
            className="flex-1 resize-none bg-transparent text-[15px] text-white placeholder-zinc-600 focus:outline-none leading-relaxed max-h-[160px]" />

          <button onClick={doSend} disabled={!hasContent || disabled || uploading}
            className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 ${
              hasContent && !disabled ? "bg-white text-black hover:bg-zinc-200" : "bg-white/10 text-zinc-600"
            }`}>
            <ArrowUp size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
