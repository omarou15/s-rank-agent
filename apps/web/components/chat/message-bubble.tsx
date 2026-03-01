"use client";

import { CodeBlock } from "./code-block";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  status: "complete" | "streaming" | "error";
  tokensInput?: number;
  tokensOutput?: number;
  costUsd?: number;
  onRunCode?: (code: string, language: string) => void;
}

function parseContent(content: string) {
  const parts: Array<{ type: "text" | "code"; content: string; language?: string }> = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Text before code block
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    // Code block
    parts.push({
      type: "code",
      language: match[1] || "bash",
      content: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < content.length) {
    parts.push({ type: "text", content: content.slice(lastIndex) });
  }

  return parts;
}

export function MessageBubble({
  role,
  content,
  status,
  tokensInput,
  tokensOutput,
  costUsd,
  onRunCode,
}: MessageBubbleProps) {
  const parts = parseContent(content);
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] ${isUser ? "" : "w-full max-w-2xl"}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-srank-primary text-white rounded-br-sm"
              : "bg-srank-card border border-srank-border rounded-bl-sm"
          } ${status === "error" ? "border-srank-red/40 bg-srank-red/5" : ""}`}
        >
          {parts.map((part, i) =>
            part.type === "code" ? (
              <CodeBlock
                key={i}
                code={part.content}
                language={part.language}
                onRun={!isUser ? onRunCode : undefined}
              />
            ) : (
              <span key={i} className="text-sm leading-relaxed whitespace-pre-wrap">
                {part.content}
              </span>
            )
          )}

          {/* Streaming cursor */}
          {status === "streaming" && (
            <span className="inline-block w-0.5 h-4 bg-srank-cyan animate-pulse ml-0.5 align-text-bottom" />
          )}
        </div>

        {/* Token info for assistant messages */}
        {!isUser && status === "complete" && costUsd !== undefined && (
          <div className="flex items-center gap-3 mt-1 px-2 text-[10px] text-srank-text-muted">
            {tokensInput !== undefined && <span>{tokensInput} in</span>}
            {tokensOutput !== undefined && <span>{tokensOutput} out</span>}
            <span className="text-srank-amber">${costUsd.toFixed(4)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
