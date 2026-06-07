"use client";

/**
 * AI 적합도 일괄 판별 버튼 컴포넌트.
 * pending 상태의 공고를 AI로 일괄 필터링한다.
 * 긴 LLM 배치는 API 라우트에서 백그라운드로 시작해 목록 작업을 막지 않는다.
 */

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  RefreshIcon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";

type State = "idle" | "loading" | "queued" | "error";

type QueueResponse = {
  success?: boolean;
  error?: string;
  alreadyRunning?: boolean;
};

const AI_BATCH_REENABLE_MS = 180_000;

export const AiFitButton = () => {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  const run = async () => {
    if (state === "loading" || state === "queued") return;
    setState("loading");
    setMessage("");

    try {
      const response = await fetch("/api/admin/job-fit/run", {
        method: "POST",
        credentials: "same-origin",
      });
      const result = (await response.json().catch(() => ({}))) as QueueResponse;

      if (!response.ok || !result.success) {
        setState("error");
        setMessage(result.error ?? "AI 판별 시작 실패");
        return;
      }

      setState("queued");
      setMessage(result.alreadyRunning ? "이미 백그라운드 실행 중" : "백그라운드 실행 중");
      setTimeout(() => setState("idle"), AI_BATCH_REENABLE_MS);
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "AI 판별 시작 실패");
    }
  };

  const styles: Record<State, string> = {
    idle: "bg-periwinkle-600 text-white hover:bg-periwinkle-700",
    loading: "bg-periwinkle-100 text-periwinkle-500 cursor-not-allowed",
    queued: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 cursor-not-allowed",
    error: "bg-red-50 text-red-500 ring-1 ring-red-200",
  };

  const icon =
    state === "queued"
      ? CheckmarkCircle01Icon
      : state === "error"
        ? AlertCircleIcon
        : RefreshIcon;

  return (
    <button
      onClick={() => void run()}
      disabled={state === "loading" || state === "queued"}
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
      {state === "loading" && "AI 판별 시작 중…"}
      {state === "queued" && message}
      {state === "error" && `오류 · ${message}`}
    </button>
  );
};
