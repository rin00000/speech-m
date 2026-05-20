import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

export interface OptionPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export function OptionPill({
  selected = false,
  className,
  children,
  ...props
}: OptionPillProps) {
  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-full border px-6 py-4 text-center text-sm font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 focus-visible:ring-offset-2",
        selected
          ? "border-violet-600 bg-violet-50 text-violet-700"
          : "border-zinc-200/50 bg-white text-stone-800 hover:bg-stone-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
