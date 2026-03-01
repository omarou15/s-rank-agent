const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Method = "GET" | "POST" | "PUT" | "DELETE";

interface RequestOptions {
  body?: unknown;
  params?: Record<string, string>;
  headers?: Record<string, string>;
}

class ApiClient {
  private token: string | null = null;

  get baseUrl() { return API_URL; }

  setToken(token: string) {
    this.token = token;
  }

  async getToken(): Promise<string | null> {
    return this.token;
  }

  private async request<T>(method: Method, path: string, opts?: RequestOptions): Promise<T> {
    const url = new URL(path, API_URL);
    if (opts?.params) {
      Object.entries(opts.params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const res = await fetch(url.toString(), {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...opts?.headers,
      },
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error || `API Error: ${res.status}`);
    }

    return res.json();
  }

  get<T>(path: string, params?: Record<string, string>) {
    return this.request<T>("GET", path, { params });
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>("POST", path, { body });
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>("PUT", path, { body });
  }

  del<T>(path: string) {
    return this.request<T>("DELETE", path);
  }

  // ── Streaming (SSE) for chat ──
  async stream(
    path: string,
    body: unknown,
    onChunk: (event: { type: string; data: string }) => void,
    onDone?: (data: unknown) => void,
    onError?: (error: string) => void,
  ) {
    const url = `${API_URL}${path}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      const err = await res.text();
      onError?.(err);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === "done") {
            onDone?.(event);
          } else if (event.type === "error") {
            onError?.(event.data);
          } else {
            onChunk(event);
          }
        } catch {
          // skip malformed
        }
      }
    }
  }
}

export const api = new ApiClient();
