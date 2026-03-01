"use client";

import { cn } from "@/lib/utils";

interface LogEntry {
  id: string;
  action: string;
  description: string;
  status: "success" | "error";
  costUsd?: number;
  createdAt: string;
}

const ACTION_ICONS: Record<string, string> = {
  code_execution: "\u26A1",
  file_created: "\u{1F4C4}",
  file_modified: "\u270F\uFE0F",
  chat_message: "\u{1F4AC}",
  connector_action: "\u{1F50C}",
  deployment: "\u{1F680}",
  server_action: "\u{1F5A5}\uFE0F",
};

interface ActivityLogProps {
  logs: LogEntry[];
  maxItems?: number;
}

export function ActivityLog({ logs, maxItems = 20 }: ActivityLogProps) {
  const displayed = logs.slice(0, maxItems);

  const formatTime = (d: string) => {
    return new Date(d).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="rounded-xl bg-srank-card border border-srank-border overflow-hidden">
      <div className="px-5 py-3 border-b border-srank-border flex items-center justify-between">
        <span className="text-sm font-semibold">Activit\u00E9 r\u00E9cente</span>
        <span className="text-[10px] text-srank-text-muted">
          {logs.length} actions
        </span>
      </div>

      {displayed.length === 0 ? (
        <div className="p-8 text-center text-xs text-srank-text-muted">
          Aucune activit\u00E9 enregistr\u00E9e
        </div>
      ) : (
        <div className="divide-y divide-srank-border">
          {displayed.map((log) => (
            <div
              key={log.id}
              className="px-5 py-3 flex items-center gap-3 hover:bg-srank-hover/50 transition-colors"
            >
              <span className="text-base flex-shrink-0">
                {ACTION_ICONS[log.action] || "\u{1F4CB}"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-srank-text-primary truncate">
                  {log.description}
                </p>
                <p className="text-[10px] text-srank-text-muted">
                  {formatTime(log.createdAt)}
                </p>
              </div>
              {log.costUsd !== undefined && log.costUsd > 0 && (
                <span className="text-[10px] font-mono text-srank-amber flex-shrink-0">
                  ${log.costUsd.toFixed(3)}
                </span>
              )}
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                  log.status === "success" ? "bg-srank-green" : "bg-srank-red"
                )}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
