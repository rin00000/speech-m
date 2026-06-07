"use client";

import { TransitionLink } from "@/components/ui/transition-link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import type { UserRole } from "@/lib/auth/session";
import { cn } from "@/lib/ui/cn";
import { getNavItemsForRole, isNavActive } from "./nav-items";
import { MobileMoreMenu } from "./mobile-more-menu";

export function BottomTab({
  userRole,
  userName,
  userEmail,
  previewPathname,
}: {
  userRole: UserRole;
  userName?: string | null;
  userEmail?: string | null;
  previewPathname?: string;
}) {
  const pathname = usePathname();
  const activePath = previewPathname ?? pathname;
  
  const allItems = getNavItemsForRole(userRole);
  const showMoreMenu = allItems.length > 4 || !!userEmail;
  const items = showMoreMenu ? allItems.slice(0, 3) : allItems;
  const moreItems = showMoreMenu ? allItems.slice(3) : [];
  
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="하단 탭 네비게이션"
        className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 md:hidden"
      >
        <div className="shadow-island flex items-center justify-around rounded-full border border-gray-200 bg-white px-2 py-2">
          {items.map((item) => {
            const active = isNavActive(activePath, item.href);
            return (
              <TransitionLink
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
              </TransitionLink>
            );
          })}
          
          {showMoreMenu && (
            <button
              onClick={() => setIsMoreOpen(true)}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-1.5 transition-colors text-gray-400"
              )}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full transition-colors bg-transparent">
                <HugeiconsIcon
                  icon={Menu01Icon}
                  size={20}
                  color="currentColor"
                  strokeWidth={1.5}
                />
              </span>
              <span className="max-w-full truncate text-[10px] font-semibold leading-none">
                더보기
              </span>
            </button>
          )}
        </div>
      </nav>

      {showMoreMenu && (
        <MobileMoreMenu
          isOpen={isMoreOpen}
          onClose={() => setIsMoreOpen(false)}
          moreItems={moreItems}
          userRole={userRole}
          userName={userName}
          userEmail={userEmail}
          activePath={activePath}
        />
      )}
    </>
  );
}
