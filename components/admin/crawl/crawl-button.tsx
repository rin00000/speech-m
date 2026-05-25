"use client";

/**
 * 크롤 즉시 실행 버튼 컴포넌트.
 * 클릭 시 해당 소스의 크롤링을 즉시 트리거하고 결과를 피드백으로 표시.
 * useAsyncAction 훅을 통해 글로벌 Progress Bar와 연동되고 중복 클릭을 방지한다.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  RefreshIcon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import { runCrawl, type CrawlSource } from "@/app/(admin)/jobs/actions";
import { useAsyncAction } from "@/lib/ui/use-async-action";

type State = "idle" | "loading" | "success" | "error";

type Props = {
  source: CrawlSource;
  label: string;
};

export const CrawlButton = ({ source, label }: Props) => {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  const { isPending, runAction } = useAsyncAction({
    onError: (err) => {
      setState("error");
      setMessage(err instanceof Error ? err.message : "크롤링 실패");
    },
  });

  const run = () => {
    if (isPending || state === "loading") return;
    setState("loading");
    setMessage("");

    runAction(async () => {
      const result = await runCrawl(source);
      if (!result.success) {
        setState("error");
        setMessage(result.error ?? "크롤링 실패");
        return;
      }
      setState("success");
      const inserted = result.inserted ?? 0;
      const updated = result.updated ?? 0;
      const parts = [`신규 ${inserted}건`];
      if (updated > 0) parts.push(`메타 갱신 ${updated}건`);
      setMessage(parts.join(" · "));
      router.refresh();
      setTimeout(() => setState("idle"), 4000);
    });
  };

  const STYLES: Record<State, string> = {
    idle: "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
    loading: "border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed",
    success: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",
    error: "bg-red-50 text-red-500 ring-1 ring-red-200",
  };

  const ICONS: Record<State, typeof RefreshIcon> = {
    idle: RefreshIcon,
    loading: RefreshIcon,
    success: CheckmarkCircle01Icon,
    error: AlertCircleIcon,
  };

  const disabled = state === "loading" || isPending;

  return (
    <button
      onClick={run}
      disabled={disabled}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold leading-none shadow-sm transition-colors ${STYLES[state]}`}
    >
      <HugeiconsIcon
        icon={ICONS[state]}
        size={15}
        color="currentColor"
        strokeWidth={2}
        className={state === "loading" ? "animate-spin" : ""}
      />
      {state === "idle" && label}
      {state === "loading" && "동기화 중…"}
      {state === "success" && `완료 · ${message}`}
      {state === "error" && `오류 · ${message}`}
    </button>
  );
};
