import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

export type BadgeTone = "neutral" | "accent" | "warn" | "success";

const toneStyles: Record<BadgeTone, string> = {
  neutral: "bg-stone-100 text-stone-700",
  accent: "bg-violet-100 text-violet-700",
  warn: "bg-amber-100 text-amber-700",
  success: "bg-emerald-100 text-emerald-700",
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
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        toneStyles[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
