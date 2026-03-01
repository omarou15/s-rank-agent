"use client";

interface ExecutionOutputProps {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  language: string;
}

export function ExecutionOutput({
  stdout,
  stderr,
  exitCode,
  duration,
  language,
}: ExecutionOutputProps) {
  const isSuccess = exitCode === 0;

  return (
    <div className="rounded-lg border border-srank-border overflow-hidden my-2">
      {/* Header */}
      <div
        className={`flex items-center justify-between px-3 py-1.5 text-[11px] ${
          isSuccess
            ? "bg-srank-green/5 border-b border-srank-green/20"
            : "bg-srank-red/5 border-b border-srank-red/20"
        }`}
      >
        <div className="flex items-center gap-2">
          <span>{isSuccess ? "✅" : "❌"}</span>
          <span className={isSuccess ? "text-srank-green" : "text-srank-red"}>
            {isSuccess ? "Success" : `Exit code: ${exitCode}`}
          </span>
        </div>
        <span className="text-srank-text-muted">{duration}ms</span>
      </div>

      {/* Output */}
      {stdout && (
        <pre className="p-3 bg-srank-bg text-xs font-mono text-srank-text-primary leading-relaxed overflow-x-auto max-h-64 overflow-y-auto">
          {stdout}
        </pre>
      )}

      {/* Stderr */}
      {stderr && (
        <pre className="p-3 bg-srank-red/5 text-xs font-mono text-srank-red leading-relaxed overflow-x-auto max-h-32 overflow-y-auto border-t border-srank-border">
          {stderr}
        </pre>
      )}
    </div>
  );
}
