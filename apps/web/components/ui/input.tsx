import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-srank-text-secondary mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full bg-srank-card border border-srank-border rounded-lg px-3 py-2.5 text-sm text-srank-text-primary",
            "placeholder:text-srank-text-muted",
            "focus:outline-none focus:border-srank-primary transition-colors",
            error && "border-srank-red focus:border-srank-red",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-srank-red">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input };
