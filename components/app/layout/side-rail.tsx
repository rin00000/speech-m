"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import type { UserRole } from "@/lib/auth/session";
import { cn } from "@/lib/ui/cn";
import { getNavItemsForRole, isNavActive } from "./nav-items";

export function SideRail({
  userRole,
  userName,
  previewPathname,
}: {
  userRole: UserRole;
  userName?: string | null;
  previewPathname?: string;
}) {
  const pathname = usePathname();
  const activePath = previewPathname ?? pathname;
  const items = getNavItemsForRole(userRole);

  return (
    <aside className="hidden h-full w-[88px] shrink-0 flex-col rounded-3xl border border-zinc-200/50 bg-white shadow-sm md:flex lg:w-[240px]">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-zinc-200/50 px-4 lg:px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-xs font-bold text-white">
          SM
        </div>
        <div className="hidden min-w-0 flex-col leading-none lg:flex">
          <span className="truncate text-sm font-extrabold text-stone-900">Speech-M</span>
          <span className="truncate text-[11px] font-medium text-stone-500">
            {userRole === "admin" ? "원장" : "준비생"}
          </span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active = isNavActive(activePath, item.href);
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-violet-100 text-violet-700"
                  : "text-stone-500 hover:bg-stone-50 hover:text-stone-800",
              )}
              title={item.label}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors",
                  active ? "bg-violet-600 text-white" : "bg-stone-100 text-stone-500 group-hover:bg-stone-200",
                )}
              >
                <HugeiconsIcon
                  icon={item.icon}
                  size={18}
                  color="currentColor"
                  strokeWidth={active ? 2 : 1.5}
                />
              </span>
              <span className="hidden truncate lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {userName && (
        <div className="hidden shrink-0 border-t border-zinc-200/50 p-4 lg:block">
          <div className="flex items-center gap-3 rounded-2xl bg-stone-50 px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
              {(userName[0] ?? "U").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-stone-800">{userName}</p>
              <p className="truncate text-[11px] font-medium text-stone-500">
                {userRole === "admin" ? "관리자" : "학생"}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
