"use client";

import { useState } from "react";

interface CodeBlockProps {
  code: string;
  language?: string;
  onRun?: (code: string, language: string) => void;
  isRunning?: boolean;
}

const LANG_LABELS: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  bash: "Bash",
  shell: "Shell",
  json: "JSON",
  html: "HTML",
  css: "CSS",
  sql: "SQL",
  yaml: "YAML",
};

const LANG_COLORS: Record<string, string> = {
  python: "#3572A5",
  javascript: "#F7DF1E",
  typescript: "#3178C6",
  bash: "#4EAA25",
  shell: "#4EAA25",
  json: "#292929",
  html: "#E34F26",
  css: "#1572B6",
  sql: "#E38C00",
};

export function CodeBlock({ code, language = "bash", onRun, isRunning }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const langColor = LANG_COLORS[language] || "#8892A8";
  const langLabel = LANG_LABELS[language] || language;
  const isRunnable = ["python", "javascript", "typescript", "bash", "shell"].includes(language);

  return (
    <div className="rounded-lg border border-srank-border overflow-hidden my-2 bg-srank-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-srank-surface border-b border-srank-border">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: langColor }}
          />
          <span className="text-[11px] text-srank-text-muted font-medium">
            {langLabel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isRunnable && onRun && (
            <button
              onClick={() => onRun(code, language)}
              disabled={isRunning}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-srank-green bg-srank-green/10 rounded hover:bg-srank-green/20 disabled:opacity-50 transition-colors"
            >
              {isRunning ? (
                <>
                  <span className="animate-spin">⟳</span> Running...
                </>
              ) : (
                <>▶ Run</>
              )}
            </button>
          )}
          <button
            onClick={handleCopy}
            className="px-2 py-0.5 text-[10px] text-srank-text-muted hover:text-srank-text-primary transition-colors"
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Code */}
      <pre className="p-3 overflow-x-auto">
        <code className="text-xs font-mono leading-relaxed text-srank-text-primary">
          {code}
        </code>
      </pre>
    </div>
  );
}
