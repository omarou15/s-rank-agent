"use client";

import { useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useChatStore } from "@/lib/stores/chat-store";
import { api } from "@/lib/api";

export function useChat() {
  const { getToken } = useAuth();
  const store = useChatStore();

  const loadConversations = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    api.setToken(token);

    try {
      const data = await api.get<{ conversations: any[] }>("/chat/conversations");
      store.setConversations(data.conversations);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  }, [getToken]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      const token = await getToken();
      if (!token) return;
      api.setToken(token);

      store.setCurrentConversation(conversationId);
      try {
        const data = await api.get<{ messages: any[] }>(
          `/chat/conversations/${conversationId}/messages`
        );
        store.setMessages(data.messages);
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    },
    [getToken]
  );

  const sendMessage = useCallback(
    async (content: string, conversationId?: string) => {
      const token = await getToken();
      if (!token) return;
      api.setToken(token);

      // Add user message to UI immediately
      const userMsgId = `user-${Date.now()}`;
      store.addMessage({
        id: userMsgId,
        role: "user",
        content,
        status: "complete",
      });

      // Create assistant placeholder
      const assistantMsgId = `assistant-${Date.now()}`;
      store.addMessage({
        id: assistantMsgId,
        role: "assistant",
        content: "",
        status: "streaming",
      });

      store.setStreaming(true);

      try {
        await api.stream(
          "/chat/stream",
          {
            content,
            conversationId: conversationId || store.currentConversationId,
          },
          // onChunk
          (event) => {
            if (event.type === "text_delta") {
              store.appendToMessage(assistantMsgId, event.data);
            }
          },
          // onDone
          (data: any) => {
            store.updateMessage(assistantMsgId, {
              status: "complete",
              tokensInput: data.tokensInput,
              tokensOutput: data.tokensOutput,
              costUsd: data.costUsd,
            });

            if (data.conversationId && !store.currentConversationId) {
              store.setCurrentConversation(data.conversationId);
            }
          },
          // onError
          (error) => {
            store.updateMessage(assistantMsgId, {
              status: "error",
              content: `Error: ${error}`,
            });
          }
        );
      } catch (err: any) {
        store.updateMessage(assistantMsgId, {
          status: "error",
          content: `Connection error: ${err.message}`,
        });
      } finally {
        store.setStreaming(false);
      }
    },
    [getToken, store.currentConversationId]
  );

  const newConversation = useCallback(() => {
    store.reset();
  }, []);

  return {
    // State
    conversations: store.conversations,
    currentConversationId: store.currentConversationId,
    messages: store.messages,
    isStreaming: store.isStreaming,
    input: store.input,
    setInput: store.setInput,

    // Actions
    loadConversations,
    loadMessages,
    sendMessage,
    newConversation,
  };
}
