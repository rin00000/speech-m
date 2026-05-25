"use client";

/**
 * AI 적합도 일괄 판별 버튼 컴포넌트.
 * pending 상태의 공고를 AI로 일괄 필터링한다.
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
import { runAiFitBatch } from "@/app/(admin)/jobs/actions";
import { useAsyncAction } from "@/lib/ui/use-async-action";

type State = "idle" | "loading" | "success" | "error";

export const AiFitButton = () => {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  const { isPending, runAction } = useAsyncAction({
    onError: (err) => {
      setState("error");
      setMessage(err instanceof Error ? err.message : "AI 판별 실패");
    },
  });

  const run = () => {
    if (isPending || state === "loading") return;
    setState("loading");
    setMessage("");

    runAction(async () => {
      const result = await runAiFitBatch();
      if (!result.success) {
        setState("error");
        setMessage(result.error ?? "AI 판별 실패");
        return;
      }
      setState("success");
      setMessage(
        `승인 ${result.approved ?? 0} · 거절 ${result.rejected ?? 0} · 보류 ${result.pending ?? 0}`
      );
      router.refresh();
      setTimeout(() => setState("idle"), 5000);
    });
  };

  const styles: Record<State, string> = {
    idle: "bg-periwinkle-600 text-white hover:bg-periwinkle-700",
    loading: "bg-periwinkle-100 text-periwinkle-500 cursor-not-allowed",
    success: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",
    error: "bg-red-50 text-red-500 ring-1 ring-red-200",
  };

  const icon =
    state === "success"
      ? CheckmarkCircle01Icon
      : state === "error"
        ? AlertCircleIcon
        : RefreshIcon;

  return (
    <button
      onClick={run}
      disabled={isPending || state === "loading"}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold leading-none shadow-sm transition-colors ${styles[state]}`}
      title="pending 공고를 AI로 일괄 판별"
    >
      <HugeiconsIcon
        icon={icon}
        size={15}
        color="currentColor"
        strokeWidth={2}
        className={state === "loading" ? "animate-pulse" : ""}
      />
      {state === "idle" && "AI 적합도 판별 실행"}
      {state === "loading" && "AI 판별 중…"}
      {state === "success" && `완료 · ${message}`}
      {state === "error" && `오류 · ${message}`}
    </button>
  );
};
