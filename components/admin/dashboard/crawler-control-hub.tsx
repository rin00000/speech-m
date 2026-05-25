"use client";

/**
 * 크롤러 제어 허브 컴포넌트 (대시보드).
 * 각 소스별 즉시 크롤 트리거 버튼과 AI 배치 필터 실행 버튼을 제공.
 * useAsyncAction 훅으로 모든 버튼이 글로벌 Progress Bar와 연동된다.
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
import { runCrawl, runAiFitBatch, type CrawlSource } from "@/app/(admin)/jobs/actions";
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAsyncAction } from "@/lib/ui/use-async-action";

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

  // AI 배치 필터 상태
  const [aiState, setAiState] = useState<SyncState>({ status: "idle", message: "" });

  // 크롤 소스별 개별 useAsyncAction 훅 (각 소스가 독립적으로 로딩 상태 관리)
  const mediajobAction = useAsyncAction();
  const saraminAction = useAsyncAction();
  const jobkoreaAction = useAsyncAction();
  const aiAction = useAsyncAction();

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

  const triggerAiBatch = () => {
    setAiState({ status: "loading", message: "" });

    aiAction.runAction(async () => {
      const result = await runAiFitBatch();
      if (!result.success) {
        setAiState({ status: "error", message: result.error ?? "AI 필터 실행 실패" });
        return;
      }

      const scanned = result.scanned ?? 0;
      const approved = result.approved ?? 0;
      const msg = `검사 ${scanned}건 (승인 ${approved}건)`;

      setAiState({ status: "success", message: msg });
      router.refresh();
      setTimeout(() => {
        setAiState({ status: "idle", message: "" });
      }, 5000);
    });
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
    <Card className="h-full">
      <CardHeader className="pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-periwinkle-100 text-periwinkle-700">
            <HugeiconsIcon icon={GlobalIcon} size={15} color="currentColor" strokeWidth={2} />
          </span>
          <div>
            <CardTitle className="text-sm font-extrabold text-gray-800">크롤러 제어 허브</CardTitle>
            <CardDescription className="text-xs text-gray-400">
              실시간 채용 공고 수집 및 AI 자동 적합도 배치 실행
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardBody className="pt-4 space-y-4">
        {/* 통계 요약 (Stat row) */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 bg-gray-50 border border-gray-150 rounded-2xl">
            <span className="text-[10px] font-bold text-gray-400">금일 스캔 수량</span>
            <p className="text-lg font-extrabold text-gray-800 mt-0.5">247건</p>
          </div>
          <div className="p-3 bg-periwinkle-50 border border-periwinkle-100 rounded-2xl">
            <span className="text-[10px] font-bold text-periwinkle-700">AI 통과 Curation</span>
            <p className="text-lg font-extrabold text-periwinkle-600 mt-0.5">18건</p>
          </div>
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
                ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                : state.status === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                : state.status === "error"
                ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300";

            return (
              <div
                key={source}
                className="flex items-center justify-between p-3 rounded-2xl border border-gray-150 bg-gray-50/30 hover:bg-gray-50 transition-colors"
              >
                <div className="space-y-0.5">
                  <span className="text-xs font-extrabold text-gray-700">{SOURCE_LABELS[source]}</span>
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
              </div>
            );
          })}
        </div>

        {/* AI batch filter execution */}
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">AI Curation</span>
            <span className="inline-flex rounded-full bg-amber-50 border border-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700">
              최대 30개 검사
            </span>
          </div>

          <Button
            onClick={triggerAiBatch}
            disabled={aiState.status === "loading" || aiAction.isPending}
            className={`w-full py-2.5 rounded-full text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
              aiState.status === "loading"
                ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
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
              ? "AI 자동 적합성 평가 중..."
              : aiState.status === "success"
              ? `평가 완료: ${aiState.message}`
              : aiState.status === "error"
              ? `평가 오류: ${aiState.message}`
              : "AI 자동 적합성 일괄 평가 실행"}
          </Button>
          <p className="text-[9px] text-center text-gray-400">
            수동으로 게시물을 분류하기 전, AI가 1차 필터링 및 앵커 점수를 부여합니다.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
