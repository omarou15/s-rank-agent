import { describe, it, expect } from "vitest";

// Inline implementation for testing without env dependency
import crypto from "crypto";

function encrypt(text: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

function decrypt(encryptedText: string, key: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(":");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "hex"),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

describe("Crypto Utils", () => {
  const testKey = crypto.randomBytes(32).toString("hex");

  it("encrypts and decrypts correctly", () => {
    const original = "sk-ant-api03-test-key-12345";
    const encrypted = encrypt(original, testKey);
    const decrypted = decrypt(encrypted, testKey);
    expect(decrypted).toBe(original);
  });

  it("produces different ciphertexts for same input", () => {
    const original = "same-text";
    const a = encrypt(original, testKey);
    const b = encrypt(original, testKey);
    expect(a).not.toBe(b);
  });

  it("encrypted format is iv:tag:data", () => {
    const encrypted = encrypt("test", testKey);
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toHaveLength(32); // 16 bytes hex
    expect(parts[1]).toHaveLength(32); // 16 bytes hex
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it("fails with wrong key", () => {
    const encrypted = encrypt("secret", testKey);
    const wrongKey = crypto.randomBytes(32).toString("hex");
    expect(() => decrypt(encrypted, wrongKey)).toThrow();
  });

  it("handles unicode and special characters", () => {
    const special = "clé-spéciale-🔑-日本語";
    const encrypted = encrypt(special, testKey);
    const decrypted = decrypt(encrypted, testKey);
    expect(decrypted).toBe(special);
  });
});
