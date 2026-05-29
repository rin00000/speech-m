"use client";

/**
 * AI 큐레이션 설정 탭.
 * 자동 필터 사용 여부와 job-fit 임계치 입력 UI를 담당한다.
 */

export const AiSettingsPanel = ({
  aiFilterEnabled,
  aiMatchThreshold,
  isPending,
  onAiFilterEnabledChange,
  onAiMatchThresholdChange,
  onSave,
}: {
  aiFilterEnabled: boolean;
  aiMatchThreshold: number;
  isPending: boolean;
  onAiFilterEnabledChange: (value: boolean) => void;
  onAiMatchThresholdChange: (value: number) => void;
  onSave: () => void;
}) => {
  return (
    <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:space-y-6 md:rounded-3xl md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">AI 큐레이션 및 필터 설정</h3>
          <p className="text-xs font-semibold text-gray-400 mt-1">
            수집된 공고들을 방송인 직군 적합도 기준에 맞추어 검증하는 AI 엔진의 민감도와 작동 여부를 구성합니다.
          </p>
        </div>
        <button
          onClick={onSave}
          disabled={isPending}
          className="rounded-full bg-periwinkle-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-periwinkle-700 active:scale-[0.98] sm:py-2"
        >
          {isPending ? "저장 중..." : "설정 저장"}
        </button>
      </div>

      <div className="border-t border-gray-100 pt-6 space-y-6">
        <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
          <div className="space-y-0.5">
            <span className="text-xs font-extrabold text-gray-800">AI 필터 엔진 상시 구동</span>
            <p className="text-[11px] font-semibold text-gray-400">
              비활성화 시, 수집되는 모든 공고가 AI 판별을 거치지 않고 전체 대기열로 즉시 유입됩니다.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={aiFilterEnabled}
              onChange={(event) => onAiFilterEnabledChange(event.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-periwinkle-600" />
          </label>
        </div>

        <div className="space-y-3 p-4 rounded-2xl border border-gray-100 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-gray-800">Curation Job-Fit 임계치 (Threshold)</span>
            <span className="rounded-full bg-periwinkle-50 border border-periwinkle-200 px-2.5 py-0.5 text-xs font-extrabold text-periwinkle-700">
              {Math.round(aiMatchThreshold * 100)}% 적합도
            </span>
          </div>
          <p className="text-[11px] font-semibold text-gray-400">
            원장님이 원하는 아나운서/앵커 등 정교한 타겟 직군과의 매칭률 기준입니다. 이 수치 이상인 공고들 위주로 자동 승인 또는 최상위 추천 큐레이션에 배치됩니다.
          </p>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:gap-4">
            <span className="text-xs font-bold text-gray-400">관대함 (0.50)</span>
            <input
              type="range"
              min="0.50"
              max="0.95"
              step="0.05"
              value={aiMatchThreshold}
              onChange={(event) => onAiMatchThresholdChange(Number.parseFloat(event.target.value))}
              className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-periwinkle-600"
            />
            <span className="text-xs font-bold text-gray-700">엄격함 (0.95)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
