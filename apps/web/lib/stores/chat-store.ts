import { create } from "zustand";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "complete" | "streaming" | "error";
  tokensInput?: number;
  tokensOutput?: number;
  costUsd?: number;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

interface ChatStore {
  // State
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];
  isStreaming: boolean;
  input: string;

  // Actions
  setConversations: (convos: Conversation[]) => void;
  setCurrentConversation: (id: string | null) => void;
  setMessages: (msgs: Message[]) => void;
  addMessage: (msg: Message) => void;
  updateMessage: (id: string, update: Partial<Message>) => void;
  appendToMessage: (id: string, text: string) => void;
  setStreaming: (v: boolean) => void;
  setInput: (v: string) => void;
  reset: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  isStreaming: false,
  input: "",

  setConversations: (conversations) => set({ conversations }),
  setCurrentConversation: (currentConversationId) => set({ currentConversationId }),
  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateMessage: (id, update) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...update } : m)),
    })),
  appendToMessage: (id, text) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + text } : m,
      ),
    })),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setInput: (input) => set({ input }),
  reset: () =>
    set({
      currentConversationId: null,
      messages: [],
      isStreaming: false,
      input: "",
    }),
}));
