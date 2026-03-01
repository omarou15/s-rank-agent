"use client";

import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function ConversationList({
  conversations,
  currentId,
  onSelect,
  onNew,
}: ConversationListProps) {
  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMin < 1) return "maintenant";
    if (diffMin < 60) return `il y a ${diffMin}m`;
    if (diffMin < 1440) return `il y a ${Math.floor(diffMin / 60)}h`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  return (
    <div className="w-64 border-r border-srank-border bg-srank-surface flex flex-col h-full">
      <div className="p-3">
        <button onClick={onNew} className="w-full py-2.5 px-3 text-xs font-medium bg-srank-primary/10 text-srank-primary border border-srank-primary/20 rounded-lg hover:bg-srank-primary/20 transition-colors">
          + Nouvelle conversation
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 ? (
          <p className="text-xs text-srank-text-muted text-center mt-8 px-4">Aucune conversation</p>
        ) : (
          <div className="space-y-0.5">
            {conversations.map((conv) => (
              <button key={conv.id} onClick={() => onSelect(conv.id)} className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg transition-colors",
                currentId === conv.id ? "bg-srank-primary/10 border border-srank-primary/20" : "hover:bg-srank-hover border border-transparent"
              )}>
                <p className={cn("text-xs font-medium truncate", currentId === conv.id ? "text-srank-primary" : "text-srank-text-primary")}>{conv.title}</p>
                <p className="text-[10px] text-srank-text-muted mt-0.5">{formatDate(conv.updatedAt)}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
