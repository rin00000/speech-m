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
        "w-full rounded-full border px-6 py-4 text-center text-sm font-semibold leading-none transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-periwinkle-500/30 focus-visible:ring-offset-2",
        selected
          ? "border-periwinkle-600 bg-periwinkle-100 text-periwinkle-700"
          : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
