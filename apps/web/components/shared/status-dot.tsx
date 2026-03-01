import { cn } from "@/lib/utils";

interface StatusDotProps {
  status: "online" | "offline" | "error" | "warning";
  label?: string;
  pulse?: boolean;
}

export function StatusDot({ status, label, pulse = true }: StatusDotProps) {
  const colors = {
    online: "bg-srank-green",
    offline: "bg-srank-text-muted",
    error: "bg-srank-red",
    warning: "bg-srank-amber",
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "w-2 h-2 rounded-full",
          colors[status],
          pulse && status === "online" && "animate-pulse"
        )}
        style={
          status === "online"
            ? { boxShadow: `0 0 6px rgba(16, 185, 129, 0.6)` }
            : undefined
        }
      />
      {label && (
        <span className="text-xs text-srank-text-secondary">{label}</span>
      )}
    </div>
  );
}
