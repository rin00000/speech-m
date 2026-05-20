import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

export type BadgeTone = "neutral" | "accent" | "warn" | "success";

const toneStyles: Record<BadgeTone, string> = {
  neutral: "border-gray-200 bg-white text-gray-600",
  accent: "border-periwinkle-200 bg-periwinkle-100 text-periwinkle-700",
  warn: "border-amber-200 bg-amber-50 text-amber-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({
  tone = "neutral",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium leading-none",
        toneStyles[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
