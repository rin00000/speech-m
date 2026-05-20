import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

export type ButtonVariant = "primary" | "ghost" | "soft";
export type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-violet-600 text-white hover:bg-violet-700 focus-visible:ring-violet-500/30",
  ghost:
    "border border-zinc-200/50 bg-white text-stone-700 hover:bg-stone-50 focus-visible:ring-stone-300/50",
  soft:
    "bg-violet-100 text-violet-700 hover:bg-violet-200 focus-visible:ring-violet-500/30",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
