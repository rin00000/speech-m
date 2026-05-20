import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export interface ListRowProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  iconClassName?: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}

export function ListRow({
  icon,
  iconClassName,
  title,
  subtitle,
  trailing,
  className,
  ...props
}: ListRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-zinc-200/50 bg-white px-4 py-3.5 shadow-sm",
        className,
      )}
      {...props}
    >
      {icon && (
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600",
            iconClassName,
          )}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-stone-900">{title}</p>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs font-medium text-stone-500">
            {subtitle}
          </p>
        )}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}
