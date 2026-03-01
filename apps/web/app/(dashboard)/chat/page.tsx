"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChatStore } from "@/lib/stores/chat-store";
import { useApi } from "@/lib/hooks/use-api";
import { api } from "@/lib/api";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { ConversationList } from "@/components/chat/conversation-list";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "complete" | "streaming" | "error";
  tokensInput?: number;
  tokensOutput?: number;
  costUsd?: number;
}

export default function ChatPage() {
  const { get, post, del } = useApi();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load conversations on mount
  useEffect(() => {
    get<{ conversations: Conversation[] }>("/chat/conversations")
      .then((data) => setConversations(data.conversations || []))
      .catch(() => {});
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (!currentConvId) { setMessages([]); return; }
    get<{ messages: Message[] }>(`/chat/conversations/${currentConvId}/messages`)
      .then((data) => setMessages((data.messages || []).map((m) => ({ ...m, status: "complete" as const }))))
      .catch(() => {});
  }, [currentConvId]);

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming) return;
    const content = input.trim();
    setInput("");

    // Optimistic user message
    const userMsg: Message = { id: `tmp-${Date.now()}`, role: "user", content, status: "complete" };
    setMessages((prev) => [...prev, userMsg]);

    // Assistant placeholder
    const assistantId = `tmp-a-${Date.now()}`;
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", status: "streaming" }]);
    setStreaming(true);

    try {
      const token = await api.getToken();
      const response = await fetch(`${api.baseUrl}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, conversationId: currentConvId }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Stream failed" }));
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: err.error || "Erreur", status: "error" } : m));
        setStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const raw = line.replace("data: ", "");
          try {
            const event = JSON.parse(raw);

            if (event.type === "text_delta") {
              fullText += event.data;
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: fullText } : m));
            }

            if (event.type === "done") {
              // Update conversation id if new
              if (event.conversationId && !currentConvId) {
                setCurrentConvId(event.conversationId);
              }
              setMessages((prev) => prev.map((m) => m.id === assistantId ? {
                ...m, content: fullText, status: "complete",
                tokensInput: event.tokensInput, tokensOutput: event.tokensOutput, costUsd: event.costUsd,
              } : m));

              // Refresh conversation list
              get<{ conversations: Conversation[] }>("/chat/conversations")
                .then((data) => setConversations(data.conversations || []))
                .catch(() => {});
            }

            if (event.type === "error") {
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: event.data || "Erreur", status: "error" } : m));
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err: any) {
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: err.message || "Erreur réseau", status: "error" } : m));
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, currentConvId, get]);

  const executeCode = async (code: string, language?: string) => {
    const execId = `exec-${Date.now()}`;
    setMessages((prev) => [...prev, { id: execId, role: "assistant", content: "\u23F3 Ex\u00E9cution en cours...", status: "streaming" }]);
    try {
      const result = await post<{ stdout: string; stderr: string; exitCode: number; duration: number }>("/chat/execute", { code, language });
      const output = result.exitCode === 0
        ? `\`\`\`\n${result.stdout}\n\`\`\`\n\u2705 Termin\u00E9 en ${result.duration}ms`
        : `\`\`\`\n${result.stderr || result.stdout}\n\`\`\`\n\u274C Exit code: ${result.exitCode}`;
      setMessages((prev) => prev.map((m) => m.id === execId ? { ...m, content: output, status: "complete" } : m));
    } catch (err: any) {
      setMessages((prev) => prev.map((m) => m.id === execId ? { ...m, content: `\u274C ${err.message}`, status: "error" } : m));
    }
  };

  const newConversation = () => {
    setCurrentConvId(null);
    setMessages([]);
    setInput("");
  };

  const deleteConversation = async (id: string) => {
    if (!confirm("Supprimer cette conversation ?")) return;
    try {
      await del(`/chat/conversations/${id}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConvId === id) newConversation();
    } catch { /* ignore */ }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <ConversationList
        conversations={conversations}
        currentId={currentConvId}
        onSelect={setCurrentConvId}
        onNew={newConversation}
      />

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-srank-text-muted">
              <span className="text-6xl mb-4">{"\u{1F3C6}"}</span>
              <h2 className="text-xl font-semibold text-srank-text-primary mb-2">S-Rank Agent</h2>
              <p className="text-sm">Demande-moi d'ex\u00E9cuter du code, g\u00E9rer des fichiers, ou n'importe quoi.</p>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              status={msg.status}
              tokensInput={msg.tokensInput}
              tokensOutput={msg.tokensOutput}
              costUsd={msg.costUsd}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={sendMessage}
          disabled={streaming}
        />
      </div>
    </div>
  );
}
