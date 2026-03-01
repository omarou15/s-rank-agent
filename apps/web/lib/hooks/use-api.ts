"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";

export function useApi() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withAuth = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | null> => {
      const token = await getToken();
      if (!token) {
        setError("Not authenticated");
        return null;
      }
      api.setToken(token);

      setLoading(true);
      setError(null);

      try {
        const result = await fn();
        return result;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [getToken]
  );

  const get = useCallback(
    <T>(path: string, params?: Record<string, string>) =>
      withAuth(() => api.get<T>(path, params)),
    [withAuth]
  );

  const post = useCallback(
    <T>(path: string, body?: unknown) =>
      withAuth(() => api.post<T>(path, body)),
    [withAuth]
  );

  const del = useCallback(
    <T>(path: string) => withAuth(() => api.del<T>(path)),
    [withAuth]
  );

  return { get, post, del, loading, error };
}
