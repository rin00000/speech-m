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
        "flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm",
        className,
      )}
      {...props}
    >
      {icon && (
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-periwinkle-200 bg-periwinkle-100 text-periwinkle-700",
            iconClassName,
          )}
        >
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight text-gray-900">{title}</p>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs font-medium leading-tight text-gray-500">
            {subtitle}
          </p>
        )}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}
