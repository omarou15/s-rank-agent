"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ConnectorMeta } from "@/lib/shared";

interface ConnectModalProps {
  connector: ConnectorMeta;
  onConnect: (credentials: Record<string, string>) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function ConnectModal({
  connector,
  onConnect,
  onClose,
  isLoading,
}: ConnectModalProps) {
  const [token, setToken] = useState("");

  const handleSubmit = () => {
    if (!token.trim()) return;
    onConnect({ token: token.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-srank-surface border border-srank-border rounded-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-1">
          Connecter {connector.name}
        </h2>
        <p className="text-xs text-srank-text-muted mb-5">
          {connector.description}
        </p>

        <Input
          type="password"
          label={connector.tokenGuide.label}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={`Colle ton ${connector.tokenGuide.label}...`}
        />

        <a
          href={connector.tokenGuide.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 mb-4 text-xs text-srank-primary hover:underline"
        >
          Comment l'obtenir \u2192
        </a>

        {/* Steps */}
        <div className="bg-srank-card rounded-lg p-3 mb-5">
          <p className="text-xs font-medium text-srank-text-secondary mb-2">
            \u00C9tapes :
          </p>
          <ol className="space-y-1">
            {connector.tokenGuide.steps.map((step, i) => (
              <li key={i} className="text-xs text-srank-text-muted">
                {i + 1}. {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!token.trim() || isLoading}
            className="flex-1"
          >
            {isLoading ? "Connexion..." : "Connecter"}
          </Button>
        </div>
      </div>
    </div>
  );
}
