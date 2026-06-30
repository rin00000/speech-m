"use client";

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
          setIsOpen(!isOpen);
        }}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition-colors hover:border-periwinkle-200 hover:text-periwinkle-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-periwinkle-300/70"
      >
        <HugeiconsIcon icon={HelpCircleIcon} size={14} color="currentColor" strokeWidth={2} />
      </button>
      <span
        role="tooltip"
        className={cn(
          "absolute top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white px-3 py-2 text-left text-xs font-medium leading-snug text-gray-600 shadow-sm transition-opacity duration-150",
          isOpen ? "visible opacity-100" : "invisible opacity-0",
          "group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100",
          tooltipAlignClassName[align],
          tooltipClassName,
        )}
      >
        {children}
      </span>
    </span>
  );
}
