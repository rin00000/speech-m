"use client";

/**
 * CRM 보존 기간과 스터디 보증금/벌금 기준액을 설정하는 탭.
 * 숫자 입력과 프리셋 버튼만 담당하고 저장은 상위 SettingsView가 실행한다.
 */

export const CrmSettingsPanel = ({
  crmRetention,
  studyDeposit,
  studyPenalty,
  isPending,
  onCrmRetentionChange,
  onStudyDepositChange,
  onStudyPenaltyChange,
  onSave,
}: {
  crmRetention: number;
  studyDeposit: number;
  studyPenalty: number;
  isPending: boolean;
  onCrmRetentionChange: (value: number) => void;
  onStudyDepositChange: (value: number) => void;
  onStudyPenaltyChange: (value: number) => void;
  onSave: () => void;
}) => {
  return (
    <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:space-y-6 md:rounded-3xl md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">CRM 정책 & 스터디 보증금 규칙</h3>
          <p className="text-xs font-semibold text-gray-400 mt-1">
            미등록 상담 신청서 자동 보존(retention) 만료 설정 및 정회원 스터디의 보증금/벌금 표준 금액을 커스텀하게 정의합니다.
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
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-gray-500">미등록 상담 신청 내역 자동 보존 주기</label>
          <p className="text-[11px] font-semibold text-gray-400">
            학원 미등록 상태인 신규 리드 데이터는 개인정보 보호 정책에 따라 지정된 보존 기간 이후 자동으로 안전하게 스크랩 영구 소멸 처리됩니다.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
            {[30, 60, 90, 180].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => onCrmRetentionChange(days)}
                className={`rounded-xl border p-3 text-center text-xs font-bold transition-all ${
                  crmRetention === days
                    ? "border-periwinkle-300 bg-periwinkle-50 text-periwinkle-700 font-extrabold"
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {days}일 보존
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <label className="text-xs font-extrabold text-gray-500">수강생 정회원 스터디 운영 규칙</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-gray-400">기본 스터디 참가 보증금 (원)</span>
              <input
                type="number"
                value={studyDeposit}
                onChange={(event) => onStudyDepositChange(Number(event.target.value))}
                className="w-full rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm focus:border-periwinkle-500 focus:ring-1 focus:ring-periwinkle-500 outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-gray-400">과제 미제출 / 지각 기본 벌금 (원)</span>
              <input
                type="number"
                value={studyPenalty}
                onChange={(event) => onStudyPenaltyChange(Number(event.target.value))}
                className="w-full rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm focus:border-periwinkle-500 focus:ring-1 focus:ring-periwinkle-500 outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
