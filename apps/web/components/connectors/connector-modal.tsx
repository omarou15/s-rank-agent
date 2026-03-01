"use client";

import { useState } from "react";
import type { ConnectorMeta } from "@s-rank/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ConnectorModalProps {
  connector: ConnectorMeta;
  onConnect: (credentials: Record<string, string>) => Promise<void>;
  onClose: () => void;
}

export function ConnectorModal({ connector, onConnect, onClose }: ConnectorModalProps) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    setLoading(true);
    setError("");
    try {
      await onConnect({ token });
      onClose();
    } catch (err: any) {
      setError(err.message || "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-srank-surface border border-srank-border rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-1">Connecter {connector.name}</h2>
        <p className="text-xs text-srank-text-muted mb-5">{connector.description}</p>

        <Input
          type="password"
          label={connector.tokenGuide.label}
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder={`Colle ton ${connector.tokenGuide.label}...`}
          error={error}
        />

        <a href={connector.tokenGuide.url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-xs text-srank-primary hover:underline">
          Comment l'obtenir
        </a>

        <div className="bg-srank-card rounded-lg p-3 mt-4 mb-5">
          <p className="text-[10px] font-medium text-srank-text-secondary mb-2">Etapes :</p>
          <ol className="space-y-1">
            {connector.tokenGuide.steps.map((step, i) => (
              <li key={i} className="text-[11px] text-srank-text-muted">{i + 1}. {step}</li>
            ))}
          </ol>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">Annuler</Button>
          <Button onClick={handleConnect} disabled={!token || loading} className="flex-1">
            {loading ? "Connexion..." : "Connecter"}
          </Button>
        </div>
      </div>
    </div>
  );
}
