"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon } from "@hugeicons/core-free-icons";
import { AdminSidebarContent } from "@/components/admin/sidebar";

type AdminMobileNavContextValue = {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
};

const AdminMobileNavContext = createContext<AdminMobileNavContextValue | null>(
  null,
);

export function useAdminMobileNav() {
  return useContext(AdminMobileNavContext);
}

export function MobileNavTrigger() {
  const ctx = useAdminMobileNav();
  if (!ctx) return null;

  const { mobileOpen, toggleMobileNav } = ctx;

  return (
    <button
      type="button"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 lg:hidden"
      aria-expanded={mobileOpen}
      aria-controls="admin-mobile-nav"
      onClick={toggleMobileNav}
    >
      <span className="sr-only">메뉴 열기</span>
      <HugeiconsIcon
        icon={Menu01Icon}
        size={20}
        color="currentColor"
        strokeWidth={1.75}
      />
    </button>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobileNav = useCallback(() => {
    setMobileOpen((o) => !o);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const ctxValue = useMemo<AdminMobileNavContextValue>(
    () => ({
      mobileOpen,
      setMobileOpen,
      toggleMobileNav,
    }),
    [mobileOpen, toggleMobileNav],
  );

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <AdminMobileNavContext.Provider value={ctxValue}>
      <div className="flex h-full overflow-hidden bg-slate-50">
        <aside className="hidden h-full w-[260px] shrink-0 flex-col bg-slate-900 lg:flex">
          <AdminSidebarContent />
        </aside>

        {mobileOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              aria-label="메뉴 닫기"
              onClick={closeMobile}
            />
            <aside
              id="admin-mobile-nav"
              className="fixed inset-y-0 left-0 z-50 flex h-full w-[260px] flex-col bg-slate-900 shadow-xl lg:hidden"
            >
              <AdminSidebarContent onNavigate={closeMobile} />
            </aside>
          </>
        ) : null}

        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    </AdminMobileNavContext.Provider>
  );
}
