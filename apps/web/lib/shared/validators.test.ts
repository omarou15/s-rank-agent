import { describe, it, expect } from "vitest";
import {
  sendMessageSchema,
  connectConnectorSchema,
  fileWriteSchema,
  provisionServerSchema,
} from "./validators";

describe("Validators", () => {
  describe("sendMessageSchema", () => {
    it("accepts valid message", () => {
      const result = sendMessageSchema.safeParse({
        content: "Hello, create a file",
        conversationId: "conv-123",
      });
      expect(result.success).toBe(true);
    });

    it("accepts message without conversationId", () => {
      const result = sendMessageSchema.safeParse({
        content: "New conversation",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty content", () => {
      const result = sendMessageSchema.safeParse({ content: "" });
      expect(result.success).toBe(false);
    });

    it("rejects missing content", () => {
      const result = sendMessageSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("connectConnectorSchema", () => {
    it("accepts valid connector", () => {
      const result = connectConnectorSchema.safeParse({
        type: "github",
        credentials: { token: "ghp_test123" },
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid connector type", () => {
      const result = connectConnectorSchema.safeParse({
        type: "invalid_service",
        credentials: { token: "test" },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("fileWriteSchema", () => {
    it("accepts valid file write", () => {
      const result = fileWriteSchema.safeParse({
        path: "/home/agent/test.ts",
        content: "console.log('hello')",
      });
      expect(result.success).toBe(true);
    });

    it("rejects path traversal", () => {
      const result = fileWriteSchema.safeParse({
        path: "../../../etc/passwd",
        content: "hack",
      });
      // Path must start with /home/agent
      expect(result.success).toBe(false);
    });
  });

  describe("provisionServerSchema", () => {
    it("accepts valid server plan", () => {
      const result = provisionServerSchema.safeParse({ size: "starter" });
      expect(result.success).toBe(true);
    });

    it("accepts all plan sizes", () => {
      for (const size of ["starter", "pro", "business"]) {
        const result = provisionServerSchema.safeParse({ size });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid size", () => {
      const result = provisionServerSchema.safeParse({ size: "mega" });
      expect(result.success).toBe(false);
    });
  });
});
