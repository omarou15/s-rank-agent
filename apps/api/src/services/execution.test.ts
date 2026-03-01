import { describe, it, expect } from "vitest";
import { ExecutionService } from "../services/execution";

describe("ExecutionService", () => {
  const service = new ExecutionService();

  describe("detectLanguage", () => {
    it("detects Python", () => {
      expect(service.detectLanguage("import pandas as pd\ndf = pd.read_csv('x')")).toBe("python");
      expect(service.detectLanguage("def hello():\n  print('hi')")).toBe("python");
    });

    it("detects TypeScript", () => {
      expect(service.detectLanguage("interface User { name: string }")).toBe("typescript");
      expect(service.detectLanguage("const x: number = 5")).toBe("typescript");
      expect(service.detectLanguage("function identity<T>(x: T): T { return x }")).toBe("typescript");
    });

    it("detects JavaScript", () => {
      expect(service.detectLanguage("const x = 5")).toBe("javascript");
      expect(service.detectLanguage("console.log('hello')")).toBe("javascript");
      expect(service.detectLanguage("const fn = () => 42")).toBe("javascript");
    });

    it("detects Bash from shebang", () => {
      expect(service.detectLanguage("#!/bin/bash\necho hello")).toBe("bash");
      expect(service.detectLanguage("#!/bin/sh\nls -la")).toBe("bash");
    });

    it("detects Bash from commands", () => {
      expect(service.detectLanguage("ls -la /home")).toBe("bash");
      expect(service.detectLanguage("mkdir -p /tmp/test")).toBe("bash");
      expect(service.detectLanguage("cat file.txt | grep error")).toBe("bash");
      expect(service.detectLanguage("npm install express")).toBe("bash");
    });

    it("defaults to bash for ambiguous input", () => {
      expect(service.detectLanguage("hello world")).toBe("bash");
    });
  });
});
