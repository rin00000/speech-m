"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  RefreshIcon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import { runCrawl, type CrawlSource } from "@/app/(admin)/jobs/actions";

type State = "idle" | "loading" | "success" | "error";

type Props = {
  source: CrawlSource;
  label: string;
};

export const CrawlButton = ({ source, label }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  const run = () => {
    setState("loading");
    setMessage("");
    startTransition(async () => {
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
      if (updated > 0) {
        parts.push(`메타 갱신 ${updated}건`);
      }
      setMessage(parts.join(" · "));
      router.refresh();
      setTimeout(() => setState("idle"), 4000);
    });
  };

  const STYLES: Record<State, string> = {
    idle: "bg-slate-100 text-slate-600 hover:bg-slate-200",
    loading: "bg-slate-100 text-slate-400 cursor-not-allowed",
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
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors ${STYLES[state]}`}
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
