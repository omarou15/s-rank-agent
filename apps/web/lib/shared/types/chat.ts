export type MessageRole = "user" | "assistant" | "system";

export type MessageStatus = "pending" | "streaming" | "complete" | "error";

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  tokensUsed: number | null;
  costUsd: number | null;
  codeBlocks: CodeBlock[];
  createdAt: Date;
}

export interface CodeBlock {
  id: string;
  language: string;
  code: string;
  output: string | null;
  exitCode: number | null;
  executedAt: Date | null;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messageCount: number;
  totalTokens: number;
  totalCostUsd: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatStreamEvent {
  type: "text_delta" | "code_block" | "execution_start" | "execution_output" | "execution_end" | "error" | "done";
  data: string;
  messageId?: string;
}
