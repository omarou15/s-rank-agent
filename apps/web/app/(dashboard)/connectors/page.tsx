"use client";

import { useState } from "react";
import { CONNECTORS } from "@/lib/shared";

type Status = "connected" | "disconnected" | "error";

export default function ConnectorsPage() {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [showModal, setShowModal] = useState<string | null>(null);

  const currentConnector = CONNECTORS.find((c) => c.type === showModal);

  const CATEGORY_LABELS: Record<string, string> = {
    code: "💻 Code",
    communication: "💬 Communication",
    storage: "💾 Stockage",
    database: "🗄️ Base de données",
    api: "🔗 APIs",
    deployment: "🚀 Déploiement",
  };

  const categories = [...new Set(CONNECTORS.map((c) => c.category))];

  return (
    <div className="h-screen overflow-y-auto">
      <div className="px-6 py-4 border-b border-srank-border">
        <h1 className="text-lg font-semibold">Connecteurs MCP</h1>
        <p className="text-xs text-srank-text-muted mt-1">
          Connecte tes services en 1 clic. L&apos;agent pourra interagir avec eux.
        </p>
      </div>

      <div className="p-6 space-y-8">
        {categories.map((cat) => (
          <div key={cat}>
            <h2 className="text-sm font-semibold text-srank-text-secondary mb-3">
              {CATEGORY_LABELS[cat] || cat}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CONNECTORS.filter((c) => c.category === cat).map((connector) => {
                const status = statuses[connector.type] || "disconnected";
                return (
                  <div
                    key={connector.type}
                    className="p-4 rounded-xl bg-srank-card border border-srank-border hover:border-srank-primary/20 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-sm">{connector.name}</h3>
                        <p className="text-xs text-srank-text-muted mt-0.5">{connector.description}</p>
                      </div>
                      <div
                        className={`w-2.5 h-2.5 rounded-full mt-1 ${
                          status === "connected" ? "bg-srank-green" :
                          status === "error" ? "bg-srank-red" :
                          "bg-srank-text-muted"
                        }`}
                      />
                    </div>
                    <button
                      onClick={() => setShowModal(connector.type)}
                      className={`w-full py-2 text-xs font-medium rounded-lg transition-colors ${
                        status === "connected"
                          ? "bg-srank-green/10 text-srank-green border border-srank-green/20"
                          : "bg-srank-primary/10 text-srank-primary border border-srank-primary/20 hover:bg-srank-primary/20"
                      }`}
                    >
                      {status === "connected" ? "✓ Connecté" : "Connecter"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Connect Modal */}
      {showModal && currentConnector && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-srank-surface border border-srank-border rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-1">Connecter {currentConnector.name}</h2>
            <p className="text-xs text-srank-text-muted mb-4">{currentConnector.description}</p>

            <label className="block text-sm font-medium mb-2">
              {currentConnector.tokenGuide.label}
              <a
                href={currentConnector.tokenGuide.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-srank-primary hover:underline inline-flex items-center gap-1"
              >
                ℹ️ Comment l&apos;obtenir
              </a>
            </label>

            <input
              type="password"
              placeholder={`Colle ton ${currentConnector.tokenGuide.label} ici...`}
              className="w-full bg-srank-card border border-srank-border rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none focus:border-srank-primary"
            />

            <div className="bg-srank-card rounded-lg p-3 mb-4">
              <p className="text-xs font-medium mb-2 text-srank-text-secondary">Étapes :</p>
              <ol className="space-y-1">
                {currentConnector.tokenGuide.steps.map((step, i) => (
                  <li key={i} className="text-xs text-srank-text-muted">
                    {i + 1}. {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(null)}
                className="flex-1 py-2.5 text-sm bg-srank-card border border-srank-border rounded-lg hover:bg-srank-hover transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setStatuses((prev) => ({ ...prev, [currentConnector.type]: "connected" }));
                  setShowModal(null);
                }}
                className="flex-1 py-2.5 text-sm bg-srank-primary text-white rounded-lg hover:bg-srank-primary-600 transition-colors"
              >
                Connecter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
