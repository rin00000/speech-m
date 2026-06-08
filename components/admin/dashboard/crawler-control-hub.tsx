"use client";

/**
 * 크롤러 제어 허브 컴포넌트 (대시보드).
 * 각 소스별 즉시 크롤 트리거 버튼과 AI 판별 큐 실행 버튼을 제공.
 * 크롤은 글로벌 Progress Bar와 연동하고, 긴 AI 배치는 백그라운드로 시작한다.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  RefreshIcon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  CpuIcon,
  GlobalIcon
} from "@hugeicons/core-free-icons";
import { runCrawl, type CrawlSource } from "@/app/(admin)/jobs/actions";
import { Card, CardHeader, CardTitle, CardDescription, CardBody, CardSurface } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAsyncAction } from "@/lib/ui/use-async-action";
import { AI_BATCH_REENABLE_MS } from "@/lib/ai/job-fit/constants";

type SyncState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
};

export function CrawlerControlHub() {
  const router = useRouter();

  // 각 크롤 소스 상태
  const [crawlStates, setCrawlStates] = useState<Record<CrawlSource, SyncState>>({
    mediajob: { status: "idle", message: "" },
    saramin: { status: "idle", message: "" },
    jobkorea: { status: "idle", message: "" },
  });

  // AI 판별 큐 상태
  const [aiState, setAiState] = useState<SyncState>({ status: "idle", message: "" });

  // 크롤 소스별 개별 useAsyncAction 훅 (각 소스가 독립적으로 로딩 상태 관리)
  const mediajobAction = useAsyncAction();
  const saraminAction = useAsyncAction();
  const jobkoreaAction = useAsyncAction();

  const getSourceAction = (source: CrawlSource) => {
    if (source === "mediajob") return mediajobAction;
    if (source === "saramin") return saraminAction;
    return jobkoreaAction;
  };

  const triggerSourceCrawl = (source: CrawlSource) => {
    const { runAction } = getSourceAction(source);

    setCrawlStates((prev) => ({
      ...prev,
      [source]: { status: "loading", message: "" },
    }));

    runAction(async () => {
      const result = await runCrawl(source);
      if (!result.success) {
        setCrawlStates((prev) => ({
          ...prev,
          [source]: { status: "error", message: result.error ?? "수집 실패" },
        }));
        return;
      }

      const inserted = result.inserted ?? 0;
      const updated = result.updated ?? 0;
      const msg = `신규 ${inserted}건 / 갱신 ${updated}건`;

      setCrawlStates((prev) => ({
        ...prev,
        [source]: { status: "success", message: msg },
      }));

      router.refresh();
      setTimeout(() => {
        setCrawlStates((prev) => ({
          ...prev,
          [source]: { ...prev[source], status: "idle" },
        }));
      }, 5000);
    });
  };

  const triggerAiBatch = async () => {
    setAiState({ status: "loading", message: "" });

    try {
      const response = await fetch("/api/admin/job-fit/run", {
        method: "POST",
        credentials: "same-origin",
      });
      const result = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        started?: boolean;
        alreadyRunning?: boolean;
      };

      if (!response.ok || !result.success) {
        setAiState({ status: "error", message: result.error ?? "AI 판별 큐 시작 실패" });
        return;
      }

      setAiState({
        status: "success",
        message:
          result.alreadyRunning || result.started === false
            ? "이미 백그라운드 실행 중"
            : "규칙 우선 처리 중",
      });
      setTimeout(() => {
        setAiState({ status: "idle", message: "" });
      }, AI_BATCH_REENABLE_MS);
    } catch (error) {
      setAiState({
        status: "error",
        message: error instanceof Error ? error.message : "AI 판별 큐 시작 실패",
      });
    }
  };

  const SOURCE_LABELS: Record<CrawlSource, string> = {
    mediajob: "미디어잡 (방송 전문)",
    saramin: "사람인 (일반 공고)",
    jobkorea: "잡코리아 (대형 포털)",
  };

  const sourceActions = {
    mediajob: mediajobAction,
    saramin: saraminAction,
    jobkorea: jobkoreaAction,
  } as const;

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="bg-gray-50/45 pb-3 md:pb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-periwinkle-700 shadow-sm ring-1 ring-periwinkle-100">
            <HugeiconsIcon icon={GlobalIcon} size={15} color="currentColor" strokeWidth={2} />
          </span>
          <div>
            <CardTitle className="text-sm font-extrabold text-gray-800">크롤러 제어 허브</CardTitle>
            <CardDescription className="text-xs text-gray-400">
              실시간 채용 공고 수집 및 AI 1차 판별 큐 실행
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardBody className="space-y-4 pt-4">
        {/* 통계 요약 (Stat row) */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <CardSurface className="p-3">
            <span className="text-[10px] font-bold text-gray-400">금일 스캔 수량</span>
            <p className="text-lg font-extrabold text-gray-800 mt-0.5">247건</p>
          </CardSurface>
          <CardSurface variant="accent" className="p-3">
            <span className="text-[10px] font-bold text-periwinkle-700">AI 통과 Curation</span>
            <p className="text-lg font-extrabold text-periwinkle-600 mt-0.5">18건</p>
          </CardSurface>
        </div>

        {/* 수집원 리스트 */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">실시간 수집 트리거</h4>

          {(["mediajob", "saramin", "jobkorea"] as const).map((source) => {
            const state = crawlStates[source];
            const { isPending } = sourceActions[source];
            const isLoading = state.status === "loading" || isPending;

            const buttonStyle =
              state.status === "loading"
                ? "bg-gray-100 text-gray-400 ring-1 ring-gray-200 cursor-not-allowed"
                : state.status === "success"
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100"
                : state.status === "error"
                ? "bg-red-50 text-red-700 ring-1 ring-red-100 hover:bg-red-100"
                : "bg-white text-gray-700 ring-1 ring-gray-100 hover:bg-gray-50 hover:ring-gray-200";

            return (
              <CardSurface
                key={source}
                interactive
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <span className="block truncate text-xs font-extrabold text-gray-700">{SOURCE_LABELS[source]}</span>
                  {state.message ? (
                    <p className={`text-[10px] font-medium leading-none ${state.status === "success" ? "text-emerald-600" : "text-red-500"}`}>
                      {state.message}
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-400 leading-none">주기적 자동 크롤링 활성</p>
                  )}
                </div>

                <button
                  onClick={() => triggerSourceCrawl(source)}
                  disabled={isLoading}
                  className={`flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-all duration-300 ${buttonStyle}`}
                  title={`${SOURCE_LABELS[source]} 즉시 동기화`}
                >
                  <HugeiconsIcon
                    icon={state.status === "success" ? CheckmarkCircle01Icon : state.status === "error" ? AlertCircleIcon : RefreshIcon}
                    size={14}
                    color="currentColor"
                    strokeWidth={2.2}
                    className={state.status === "loading" ? "animate-spin" : ""}
                  />
                </button>
              </CardSurface>
            );
          })}
        </div>

        {/* AI batch filter execution */}
        <CardSurface className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">AI Curation</span>
            <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 ring-1 ring-amber-100/80">
              최대 30개 · 규칙 우선
            </span>
          </div>

          <Button
            onClick={() => void triggerAiBatch()}
            disabled={aiState.status === "loading" || aiState.status === "success"}
            className={`w-full py-2.5 rounded-full text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
              aiState.status === "loading"
                ? "bg-gray-100 text-gray-400 ring-1 ring-gray-200 cursor-not-allowed"
                : aiState.status === "success"
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : aiState.status === "error"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-periwinkle-600 hover:bg-periwinkle-700 text-white shadow-sm"
            }`}
          >
            <HugeiconsIcon
              icon={aiState.status === "success" ? CheckmarkCircle01Icon : aiState.status === "error" ? AlertCircleIcon : CpuIcon}
              size={14}
              color="currentColor"
              strokeWidth={2}
              className={aiState.status === "loading" ? "animate-spin" : ""}
            />
            {aiState.status === "loading"
              ? "AI 판별 큐 등록 중..."
              : aiState.status === "success"
              ? `큐 실행 중: ${aiState.message}`
              : aiState.status === "error"
              ? `큐 오류: ${aiState.message}`
              : "AI 1차 판별 큐 실행"}
          </Button>
          <p className="text-[9px] text-center text-gray-400">
            명확한 공고는 규칙으로 먼저 분류하고, LLM 필요 공고만 제한 큐에서 처리합니다.
          </p>
        </CardSurface>
      </CardBody>
    </Card>
  );
}
