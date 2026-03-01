import { cn } from "@/lib/utils";

interface BadgeProps {
  variant?: "default" | "success" | "warning" | "error" | "info";
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium",
        {
          "bg-srank-primary/10 text-srank-primary": variant === "default",
          "bg-srank-green/10 text-srank-green": variant === "success",
          "bg-srank-amber/10 text-srank-amber": variant === "warning",
          "bg-srank-red/10 text-srank-red": variant === "error",
          "bg-srank-cyan/10 text-srank-cyan": variant === "info",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
