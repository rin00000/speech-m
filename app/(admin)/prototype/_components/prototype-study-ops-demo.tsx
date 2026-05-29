"use client";

/**
 * 프로토타입 쇼케이스의 스터디 피드백과 크롤러 허브 데모.
 * 임시 동기화 상태를 내부에서 관리해 카탈로그 루트 상태를 줄인다.
 */

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle01Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

type PrototypeStudyOpsDemoProps = {
  cardBgClass: string;
  glowClass: string;
};

export function PrototypeStudyOpsDemo({
  cardBgClass,
  glowClass,
}: PrototypeStudyOpsDemoProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "success">("idle");

  const handleSyncTrigger = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncStatus("success");
      setTimeout(() => setSyncStatus("idle"), 3000);
    }, 1500);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className={cn("p-6 transition-all duration-300", cardBgClass, glowClass)}>
        <div className="mb-4 space-y-1">
          <span className="inline-flex rounded-full border border-periwinkle-200 bg-periwinkle-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-periwinkle-700">
            Module: Study Operations
          </span>
          <h3 className="mt-1 text-base font-extrabold leading-tight text-gray-900">
            1:1 릴레이 피드백 콘솔
          </h3>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-gray-150 bg-gray-50/50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold text-gray-800">
                김서현 준비생 (KBS 뉴스 앵커 반)
              </p>
              <span className="h-2 w-2 animate-ping rounded-full bg-periwinkle-600" />
            </div>
            <p className="mt-1 text-xs leading-tight text-gray-400">
              제출 음성: <strong>news_practice_kbs_05.mp3</strong>
            </p>

            <div className="mt-3 flex items-center justify-between rounded-full border border-gray-200 bg-white p-1 px-3">
              <span className="text-[10px] font-semibold text-gray-500">
                제출 녹음 02:14
              </span>
              <button className="flex h-6 w-6 items-center justify-center rounded-full bg-periwinkle-600 text-white shadow-sm transition-colors hover:bg-periwinkle-700">
                <span className="text-[9px] font-extrabold">▶</span>
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400">
              원장 피드백 코멘트
            </label>
            <textarea
              className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-periwinkle-500/30"
              rows={3}
              defaultValue="오프닝 멘트의 톤이 매우 신뢰감 있게 보강되었습니다. 다만, 3번째 줄 수치 정보 낭독 시 긴장으로 인해 끝음을 살짝 올리는 습관이 아직 남아있으니 이 부분을 플랫하게 내려주는 연습이 필요합니다."
            />
          </div>

          <Button className="w-full py-2 text-xs font-semibold">
            피드백 전송 완료
          </Button>
        </div>
      </div>

      <div className={cn("p-6 transition-all duration-300", cardBgClass, glowClass)}>
        <div className="mb-4 space-y-1">
          <span className="inline-flex rounded-full border border-periwinkle-200 bg-periwinkle-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-periwinkle-700">
            Module: Scraper Dashboard
          </span>
          <h3 className="mt-1 text-base font-extrabold leading-tight text-gray-900">
            크롤러 제어 허브
          </h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-2xl border border-gray-150 bg-gray-50 p-3">
              <span className="text-[10px] font-bold text-gray-400">금일 크롤 수량</span>
              <p className="mt-1 text-xl font-extrabold text-gray-800">247건</p>
            </div>
            <div className="rounded-2xl border border-gray-150 bg-gray-50 p-3">
              <span className="text-[10px] font-bold text-gray-400">
                AI 통과 Curation
              </span>
              <p className="mt-1 text-xl font-extrabold text-periwinkle-700">18건</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-700">미디어잡 동기화</span>
              <span className="text-[10px] font-medium text-gray-400">최근 2시간 전</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-700">아랑 카페 동기화</span>
              <span className="text-[10px] font-medium text-gray-400">최근 4시간 전</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleSyncTrigger}
              disabled={isSyncing}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-semibold leading-none shadow-sm transition-all duration-300",
                isSyncing
                  ? "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400"
                  : syncStatus === "success"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-600"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
              )}
            >
              <HugeiconsIcon
                icon={syncStatus === "success" ? CheckmarkCircle01Icon : RefreshIcon}
                size={13}
                color="currentColor"
                strokeWidth={2}
                className={isSyncing ? "animate-spin" : ""}
              />
              {isSyncing
                ? "수집 동기화 중..."
                : syncStatus === "success"
                  ? "동기화 완료"
                  : "실시간 수집 트리거"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
