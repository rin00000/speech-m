"use client";

/**
 * 작은 도움말 버튼과 툴팁 표시 상태를 관리하는 공용 UI 컴포넌트입니다.
 * 버튼 클릭, hover, 외부 클릭 닫힘을 한곳에서 처리해 카드와 헤더 설명에 재사용합니다.
 */

import { useState, useRef, useEffect, type ReactNode } from "react";
import { HelpCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/ui/cn";

type InfoHintProps = {
  children: ReactNode;
  align?: "center" | "left" | "right";
  className?: string;
  tooltipClassName?: string;
  label?: string;
};

const tooltipAlignClassName = {
  center: "left-1/2 -translate-x-1/2",
  left: "left-0",
  right: "right-0",
};

export function InfoHint({
  children,
  align = "center",
  className,
  tooltipClassName,
  label = "설명 보기",
}: InfoHintProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <span 
      ref={containerRef}
      className={cn("group relative inline-flex shrink-0", className)}
    >
      <button
        type="button"
        aria-label={label}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen((current) => !current);
        }}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-periwinkle-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-periwinkle-300/70"
      >
        <HugeiconsIcon icon={HelpCircleIcon} size={14} color="currentColor" strokeWidth={2} />
      </button>
      <span
        role="tooltip"
        className={cn(
          "absolute top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white px-3 py-2 text-left text-xs font-medium leading-snug text-gray-600 shadow-sm transition-opacity duration-150",
          isOpen ? "visible opacity-100" : "invisible opacity-0",
          "group-hover:visible group-hover:opacity-100",
          tooltipAlignClassName[align],
          tooltipClassName,
        )}
      >
        {children}
      </span>
    </span>
  );
}
