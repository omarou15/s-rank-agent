"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ConnectorMeta } from "@/lib/shared";

interface ConnectorCardProps {
  connector: ConnectorMeta;
  status: "connected" | "disconnected" | "error";
  onConnect: () => void;
  onDisconnect: () => void;
  onTest: () => void;
}

export function ConnectorCard({
  connector,
  status,
  onConnect,
  onDisconnect,
  onTest,
}: ConnectorCardProps) {
  return (
    <div className="p-4 rounded-xl bg-srank-card border border-srank-border hover:border-srank-primary/20 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{connector.name}</h3>
            <Badge
              variant={
                status === "connected"
                  ? "success"
                  : status === "error"
                    ? "error"
                    : "default"
              }
            >
              {status === "connected"
                ? "Actif"
                : status === "error"
                  ? "Erreur"
                  : "Inactif"}
            </Badge>
          </div>
          <p className="text-xs text-srank-text-muted mt-1">
            {connector.description}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {status === "connected" ? (
          <>
            <Button size="sm" variant="ghost" onClick={onTest} className="flex-1">
              Tester
            </Button>
            <Button size="sm" variant="danger" onClick={onDisconnect} className="flex-1">
              D\u00E9connecter
            </Button>
          </>
        ) : (
          <Button size="sm" variant="primary" onClick={onConnect} className="w-full">
            Connecter
          </Button>
        )}
      </div>
    </div>
  );
}
