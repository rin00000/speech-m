"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import type { UserRole } from "@/lib/auth/session";
import { cn } from "@/lib/ui/cn";
import { getNavItemsForRole, isNavActive } from "./nav-items";

export function BottomTab({
  userRole,
  previewPathname,
}: {
  userRole: UserRole;
  previewPathname?: string;
}) {
  const pathname = usePathname();
  const activePath = previewPathname ?? pathname;
  const items = getNavItemsForRole(userRole).slice(0, 4);

  return (
    <nav
      aria-label="하단 탭 네비게이션"
      className="fixed inset-x-4 bottom-4 z-50 md:hidden"
    >
      <div className="shadow-island flex items-center justify-around rounded-full border border-gray-200 bg-white px-2 py-2">
        {items.map((item) => {
          const active = isNavActive(activePath, item.href);
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-1.5 transition-colors",
                active ? "text-periwinkle-700" : "text-gray-400",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                  active ? "bg-periwinkle-100" : "bg-transparent",
                )}
              >
                <HugeiconsIcon
                  icon={item.icon}
                  size={20}
                  color="currentColor"
                  strokeWidth={active ? 2 : 1.5}
                />
              </span>
              <span className="max-w-full truncate text-[10px] font-semibold leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
