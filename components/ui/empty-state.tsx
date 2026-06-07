import { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
        {icon ?? "🍃"}
      </div>
      <h3 className="mb-2 text-base font-extrabold tracking-tight text-gray-900">
        {title}
      </h3>
      {description && (
        <div className="mb-6 max-w-sm text-sm font-medium leading-relaxed text-gray-500">
          {description}
        </div>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
