"use client";

/**
 * NextAuth 세션을 종료하는 공통 로그아웃 버튼.
 * 개발 모드 persona 쿠키도 함께 지워 실제 세션 상태로 돌아가게 한다.
 */

import { useState } from "react";
import { signOut } from "next-auth/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Logout01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/ui/cn";

type LogoutButtonProps = {
  variant?: "icon" | "full";
  className?: string;
};

export function LogoutButton({
  variant = "full",
  className,
}: LogoutButtonProps) {
  const [isPending, setIsPending] = useState(false);

  const handleLogout = async () => {
    if (isPending) return;
    setIsPending(true);

    if (process.env.NODE_ENV !== "production") {
      document.cookie = "mock_role=; path=/; max-age=0";
    }

    try {
      await signOut({ callbackUrl: "/login" });
    } catch {
      setIsPending(false);
    }
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={isPending}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:pointer-events-none disabled:opacity-60",
          className,
        )}
        aria-label="로그아웃"
        title="로그아웃"
      >
        <HugeiconsIcon
          icon={Logout01Icon}
          size={18}
          color="currentColor"
          strokeWidth={1.8}
          className={isPending ? "animate-pulse" : undefined}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={isPending}
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-600 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:pointer-events-none disabled:opacity-60",
        className,
      )}
    >
      <HugeiconsIcon
        icon={Logout01Icon}
        size={16}
        color="currentColor"
        strokeWidth={1.8}
        className={isPending ? "animate-pulse" : undefined}
      />
      <span>{isPending ? "로그아웃 중" : "로그아웃"}</span>
    </button>
  );
}
