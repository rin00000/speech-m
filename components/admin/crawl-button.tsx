"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  RefreshIcon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";

type State = "idle" | "loading" | "success" | "error";

type Props = {
  apiPath: string;
  label: string;
};

export const CrawlButton = ({ apiPath, label }: Props) => {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  const run = async () => {
    setState("loading");
    setMessage("");
    try {
      const res = await fetch(apiPath, { method: "POST" });
      const json = await res.json();

      if (!res.ok || json.error) {
        setState("error");
        setMessage(json.error ?? "크롤링 실패");
        return;
      }

      setState("success");
      setMessage(`${json.saved}건 저장`);
      router.refresh();

      setTimeout(() => setState("idle"), 4000);
    } catch {
      setState("error");
      setMessage("네트워크 오류");
    }
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

  return (
    <button
      onClick={run}
      disabled={state === "loading"}
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
      {state === "loading" && "수집 중…"}
      {state === "success" && `완료 · ${message}`}
      {state === "error" && `오류 · ${message}`}
    </button>
  );
};
