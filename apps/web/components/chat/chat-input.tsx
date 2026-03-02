"use client";
import { useState, useRef, useEffect } from "react";
import { ArrowUp, Paperclip, X, FileText, Image, FileCode, Loader2 } from "lucide-react";

export interface UploadedFile { name: string; size: number; path: string; type: string; base64?: string; }
interface ChatInputProps { onSend: (message: string, files?: UploadedFile[]) => void; disabled?: boolean; placeholder?: string; }

function getCat(n: string) { const e = n.split(".").pop()?.toLowerCase() || ""; if (["png","jpg","jpeg","gif","svg","webp"].includes(e)) return "image"; if (["ts","tsx","js","jsx","py","sh","html","css","json","md","csv","sql"].includes(e)) return "code"; return "default"; }
function fmtSize(b: number) { if (b < 1024) return b + " B"; if (b < 1048576) return (b/1024).toFixed(1) + " KB"; return (b/1048576).toFixed(1) + " MB"; }
const ICONS: Record<string, any> = { image: Image, code: FileCode, default: FileText };
const IMG_EXTS = ["png","jpg","jpeg","gif","webp"];

export function ChatInput({ onSend, disabled, placeholder = "Demande quelque chose..." }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [focused, setFocused] = useState(false);
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

  const addFile = async (file: File) => {
    setUploading(true);
    try {
      // Read as base64
      const b64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(",")[1] || "");
        r.onerror = rej;
        r.readAsDataURL(file);
      });

      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const isImage = IMG_EXTS.includes(ext);

      if (isImage) {
        // Images: keep base64 locally for Claude vision — NO VPS upload needed
        setFiles(p => [...p, {
          name: file.name,
          size: file.size,
          path: `local://${file.name}`,
          type: file.type || `image/${ext === "jpg" ? "jpeg" : ext}`,
          base64: b64,
        }]);
      } else {
        // Non-images: upload to VPS for agent to use
        const path = `/home/agent/uploads/${file.name}`;
        try {
          await fetch("/api/files", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path, content: b64, encoding: "base64" }),
          });
        } catch {
          // VPS upload failed — still add file reference
        }
        setFiles(p => [...p, { name: file.name, size: file.size, path, type: file.type }]);
      }
    } catch (err) {
      console.error("File read error:", err);
    } finally {
      setUploading(false);
    }
  };

  const hasContent = value.trim().length > 0 || files.length > 0;

  return (
    <div className="px-4 py-3">
      <div
        className={`relative rounded-2xl transition-all duration-300 ${dragOver ? "scale-[1.01]" : ""}`}
        style={{
          background: "rgba(30, 30, 40, 0.6)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          border: `1px solid ${focused ? "rgba(10,132,255,0.3)" : dragOver ? "rgba(10,132,255,0.2)" : "rgba(255,255,255,0.08)"}`,
          boxShadow: focused ? "0 0 0 3px rgba(10,132,255,0.08), 0 8px 32px rgba(0,0,0,0.3)" : "0 4px 24px rgba(0,0,0,0.2)",
        }}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); Array.from(e.dataTransfer.files).forEach(addFile); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}>

        {/* Image previews */}
        {files.some(f => f.base64) && (
          <div className="flex gap-2 px-4 pt-3">
            {files.filter(f => f.base64).map((f, i) => (
              <div key={i} className="relative group">
                <img src={`data:${f.type};base64,${f.base64}`} alt={f.name}
                  className="w-14 h-14 object-cover rounded-xl"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
                <button onClick={() => setFiles(p => p.filter(x => x.name !== f.name))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  style={{ background: "rgba(255,69,58,0.9)", backdropFilter: "blur(10px)" }}>
                  <X size={10} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* File chips (non-images) */}
        {files.filter(f => !f.base64).length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-3">
            {files.filter(f => !f.base64).map((f, i) => { const I = ICONS[getCat(f.name)]; return (
              <div key={i} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <I size={12} className="text-white/40" />
                <span className="text-xs text-white/60 max-w-[120px] truncate">{f.name}</span>
                <span className="text-[10px] text-white/25">{fmtSize(f.size)}</span>
                <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} className="text-white/25 hover:text-white/60 ml-0.5"><X size={12} /></button>
              </div>
            ); })}
          </div>
        )}

        <div className="flex items-end gap-2 p-3">
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all disabled:opacity-30">
            {uploading ? <Loader2 size={16} className="animate-spin text-[#0A84FF]" /> : <Paperclip size={16} />}
          </button>
          <input ref={fileRef} type="file" multiple accept="*/*" className="hidden" onChange={(e) => { if (e.target.files) Array.from(e.target.files).forEach(addFile); e.target.value = ""; }} />

          <textarea ref={taRef} value={value} onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(); } }}
            placeholder={uploading ? "Upload en cours..." : dragOver ? "Dépose ici..." : placeholder}
            disabled={disabled || uploading} rows={1}
            className="flex-1 resize-none bg-transparent text-[15px] text-white/90 placeholder-white/25 focus:outline-none leading-relaxed max-h-[160px]" />

          <button onClick={doSend} disabled={!hasContent || disabled || uploading}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300"
            style={{
              background: hasContent && !disabled ? "linear-gradient(135deg, #0A84FF, #5E5CE6)" : "rgba(255,255,255,0.06)",
              boxShadow: hasContent && !disabled ? "0 4px 12px rgba(10,132,255,0.3)" : "none",
              opacity: hasContent && !disabled ? 1 : 0.4,
            }}>
            <ArrowUp size={16} strokeWidth={2.5} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
