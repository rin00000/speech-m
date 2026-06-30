"use client";

/**
 * 모바일 스크롤 컨테이너에 pull-to-refresh 제스처와 상태 표시를 제공한다.
 * 페이지별 스크롤 레이아웃 class는 호출부에서 넘기고, 새로고침은 router.refresh()로 통일한다.
 */

import type { HTMLAttributes, TouchEvent } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/ui/cn";

const REFRESH_THRESHOLD_PX = 72;
const MAX_PULL_DISTANCE_PX = 108;
const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

type PullGestureState = "idle" | "watching" | "pulling" | "ignored";

export interface PullToRefreshContainerProps extends HTMLAttributes<HTMLDivElement> {
  disabled?: boolean;
}

const isInteractiveTarget = (target: EventTarget | null) =>
  target instanceof Element &&
  Boolean(
    target.closest(
      "a, button, input, textarea, select, summary, [contenteditable='true'], [tabindex]:not([tabindex='-1'])"
    )
  );

export const PullToRefreshContainer = ({
  children,
  className,
  disabled = false,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
  ...props
}: PullToRefreshContainerProps) => {
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshLocked, setIsRefreshLocked] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();
  const gestureStateRef = useRef<PullGestureState>("idle");
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const pullDistanceRef = useRef(0);
  const refreshTimerRef = useRef<number | null>(null);
  const isRefreshing = isRefreshLocked || isTransitionPending;

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const resetPull = () => {
    gestureStateRef.current = "idle";
    pullDistanceRef.current = 0;
    setPullDistance(0);
  };

  const triggerRefresh = () => {
    gestureStateRef.current = "idle";
    pullDistanceRef.current = REFRESH_THRESHOLD_PX;
    setPullDistance(REFRESH_THRESHOLD_PX);
    setIsRefreshLocked(true);

    startTransition(() => {
      router.refresh();
    });

    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = window.setTimeout(() => {
      setIsRefreshLocked(false);
      resetPull();
    }, 900);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (disabled || isRefreshing || !window.matchMedia(MOBILE_MEDIA_QUERY).matches) {
      gestureStateRef.current = "ignored";
      return;
    }

    if (isInteractiveTarget(event.target)) {
      gestureStateRef.current = "ignored";
      return;
    }

    if (event.currentTarget.scrollTop > 0) {
      gestureStateRef.current = "ignored";
      return;
    }

    const touch = event.touches[0];
    if (!touch) return;

    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    pullDistanceRef.current = 0;
    gestureStateRef.current = "watching";
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (gestureStateRef.current === "idle" || gestureStateRef.current === "ignored") return;

    const touch = event.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - startXRef.current;
    const deltaY = touch.clientY - startYRef.current;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (deltaY <= 0 || event.currentTarget.scrollTop > 0) {
      resetPull();
      return;
    }

    if (gestureStateRef.current === "watching" && absDeltaX > absDeltaY) {
      gestureStateRef.current = "ignored";
      return;
    }

    if (absDeltaY < 8 || absDeltaY < absDeltaX) return;

    event.preventDefault();
    gestureStateRef.current = "pulling";

    const nextDistance = Math.min(deltaY * 0.55, MAX_PULL_DISTANCE_PX);
    pullDistanceRef.current = nextDistance;
    setPullDistance(nextDistance);
  };

  const handleTouchEnd = () => {
    if (gestureStateRef.current !== "pulling") {
      resetPull();
      return;
    }

    if (pullDistanceRef.current >= REFRESH_THRESHOLD_PX) {
      triggerRefresh();
      return;
    }

    resetPull();
  };

  const indicatorText = isRefreshing
    ? "새로고침 중"
    : pullDistance >= REFRESH_THRESHOLD_PX
      ? "놓으면 새로고침"
      : "당겨서 새로고침";
  const showIndicator = isRefreshing || pullDistance > 0;

  return (
    <div
      {...props}
      className={cn("relative overscroll-y-contain", className)}
      onTouchStart={(event) => {
        onTouchStart?.(event);
        handleTouchStart(event);
      }}
      onTouchMove={(event) => {
        onTouchMove?.(event);
        handleTouchMove(event);
      }}
      onTouchEnd={(event) => {
        onTouchEnd?.(event);
        handleTouchEnd();
      }}
      onTouchCancel={(event) => {
        onTouchCancel?.(event);
        resetPull();
      }}
    >
      {children}
      <div
        aria-hidden={!showIndicator}
        className={cn(
          "pointer-events-none absolute left-0 right-0 top-2 z-20 !mt-0 flex justify-center transition-opacity duration-150 md:hidden",
          showIndicator ? "opacity-100" : "opacity-0",
        )}
      >
        <div
          className="inline-flex items-center gap-2 rounded-full border border-periwinkle-100 bg-white/95 px-3 py-1.5 text-[11px] font-extrabold text-periwinkle-700 shadow-sm"
          style={{
            transform: `translateY(${Math.min(pullDistance, REFRESH_THRESHOLD_PX) * 0.35}px)`,
          }}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full bg-periwinkle-500",
              isRefreshing && "animate-pulse",
            )}
          />
          {indicatorText}
        </div>
      </div>
    </div>
  );
};
