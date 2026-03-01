"use client";

import { useState } from "react";

export function FilePreview({ filename, content }: { filename: string; content: string }) {
  const [copied, setCopied] = useState(false);
  const ext = filename.split(".").pop() || "";
  const lines = content.split("\n");
  const copy = async () => { await navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="h-full flex flex-col bg-srank-card rounded-xl border border-srank-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-srank-border bg-srank-surface">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-srank-text-muted">{filename}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-srank-bg text-srank-text-muted uppercase">{ext}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-srank-text-muted">{lines.length} lignes</span>
          <button onClick={copy} className="text-[10px] text-srank-text-muted hover:text-srank-primary transition-colors">{copied ? "\u2713" : "Copier"}</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="flex">
          <div className="flex-shrink-0 py-3 px-3 text-right border-r border-srank-border bg-srank-bg/50 select-none">
            {lines.map((_, i) => <div key={i} className="text-[11px] font-mono text-srank-text-muted leading-5">{i + 1}</div>)}
          </div>
          <pre className="flex-1 p-3 overflow-x-auto"><code className="text-[12px] font-mono text-srank-text-primary leading-5">{content}</code></pre>
        </div>
      </div>
    </div>
  );
}
