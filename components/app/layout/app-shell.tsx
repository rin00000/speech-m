"use client";

/**
 * 앱 최상위 Shell 컴포넌트.
 * 사이드바(SideRail), 하단 탭(BottomTab), 개발용 DevRoleSimulator를 포함.
 * LoadingProvider로 전체를 감싸 Server Action 버튼이 글로벌 Progress Bar와 연동되도록 한다.
 */

import type { MouseEvent, ReactNode } from "react";
import type { UserRole } from "@/lib/auth/session";
import { LoadingProvider, useLoading } from "@/lib/ui/loading-context";
import { BottomTab } from "./bottom-tab";
import { DevRoleSimulator } from "./dev-role-simulator";
import { SideRail } from "./side-rail";
import { cn } from "@/lib/ui/cn";

function shouldShowNavigationFeedback(event: MouseEvent<HTMLElement>) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return false;
  }

  const targetElement =
    event.target instanceof Element
      ? event.target
      : event.target instanceof Node
        ? event.target.parentElement
        : null;
  if (!targetElement) return false;

  const anchor = targetElement.closest<HTMLAnchorElement>("a[href]");
  if (!anchor || !event.currentTarget.contains(anchor)) return false;

  const target = anchor.getAttribute("target");
  if ((target && target !== "_self") || anchor.hasAttribute("download")) return false;

  const rawHref = anchor.getAttribute("href");
  if (!rawHref || rawHref.startsWith("#")) return false;

  const url = new URL(anchor.href);
  if (url.origin !== window.location.origin) return false;

  const currentRoute = `${window.location.pathname}${window.location.search}`;
  const nextRoute = `${url.pathname}${url.search}`;
  return currentRoute !== nextRoute;
}

function AppShellContent({
  children,
  userRole,
  userName,
  userEmail,
  isAuthenticated,
  previewPathname,
  hideNav,
}: {
  children: ReactNode;
  userRole: UserRole;
  userName?: string | null;
  userEmail?: string | null;
  isAuthenticated?: boolean;
  previewPathname?: string;
  hideNav: boolean;
}) {
  const { isNavigating, startNavigation } = useLoading();

  const handleNavigationFeedback = (event: MouseEvent<HTMLDivElement>) => {
    if (!shouldShowNavigationFeedback(event)) return;
    startNavigation();
  };

  return (
    <div
      className="flex min-h-dvh md:h-dvh md:overflow-hidden md:gap-4 md:p-4"
      onClick={handleNavigationFeedback}
    >
      {!hideNav && (
        <SideRail
          userRole={userRole}
          userName={userName}
          userEmail={userEmail}
          isAuthenticated={isAuthenticated}
          previewPathname={previewPathname}
        />
      )}

      <main
        className={cn(
          "flex min-h-dvh min-w-0 flex-1 flex-col overflow-visible pb-[calc(6rem+env(safe-area-inset-bottom))] md:h-[calc(100vh-2rem)] md:min-h-0 md:overflow-hidden md:rounded-3xl md:border md:border-gray-200 md:bg-white md:pb-0 md:shadow-sm transition-opacity duration-200",
          isNavigating ? "opacity-40 pointer-events-none" : "opacity-100"
        )}
      >
        {children}
      </main>

      {!hideNav && (
        <BottomTab 
          userRole={userRole} 
          userName={userName}
          userEmail={userEmail}
          previewPathname={previewPathname} 
        />
      )}

      {process.env.NODE_ENV !== "production" && <DevRoleSimulator />}
    </div>
  );
}

export function AppShell({
  children,
  userRole,
  userName,
  userEmail,
  isAuthenticated,
  previewPathname,
  hideNav = false,
}: {
  children: ReactNode;
  userRole: UserRole;
  userName?: string | null;
  userEmail?: string | null;
  isAuthenticated?: boolean;
  previewPathname?: string;
  hideNav?: boolean;
}) {
  return (
    <LoadingProvider>
      <AppShellContent
        userRole={userRole}
        userName={userName}
        userEmail={userEmail}
        isAuthenticated={isAuthenticated}
        previewPathname={previewPathname}
        hideNav={hideNav}
      >
        {children}
      </AppShellContent>
    </LoadingProvider>
  );
}
