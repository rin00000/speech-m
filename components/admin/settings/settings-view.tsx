"use client";

/**
 * 시스템 통합 설정 뷰 컴포넌트.
 * 프로필/AI 큐레이션/크롤링/CRM 탭 설정을 관리한다.
 * useAsyncAction 훅으로 모든 저장 버튼이 글로벌 Progress Bar와 연동된다.
 */

import { useState } from "react";
import { updateProfileName, removeBlockedUrl, updateSystemSetting } from "@/app/(admin)/settings/actions";
import { useAsyncAction } from "@/lib/ui/use-async-action";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserIcon,
  Settings01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Briefcase01Icon,
  DashboardSquare01Icon,
} from "@hugeicons/core-free-icons";

// 탭 정의
type SettingsTab = "profile" | "ai" | "crawl" | "crm";

interface UserProfile {
  email: string;
  name: string | null;
  role: "admin" | "student" | "guest";
}

interface BlockedUrlItem {
  source_url: string;
  reason: string | null;
  created_at: string;
}

interface SettingsViewProps {
  user: UserProfile;
  initialSettings: {
    ai_filter_enabled?: boolean;
    ai_match_threshold?: number;
    crawl_interval_hours?: number;
    crawl_channels_active?: { mediajob: boolean; arang: boolean; kbs: boolean };
    crm_retention_days?: number;
    study_deposit_amount?: number;
    study_penalty_amount?: number;
  };
  initialBlockedUrls: BlockedUrlItem[];
}

export function SettingsView({ user, initialSettings, initialBlockedUrls }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(user.role === "admin" ? "profile" : "profile");
  
  // 1. 프로필 관련 State
  const [displayName, setDisplayName] = useState(user.name ?? "");

  // 2. AI 큐레이션 관련 State
  const [aiFilterEnabled, setAiFilterEnabled] = useState(initialSettings.ai_filter_enabled ?? true);
  const [aiMatchThreshold, setAiMatchThreshold] = useState(initialSettings.ai_match_threshold ?? 0.75);

  // 3. 크롤링 관련 State
  const [crawlInterval, setCrawlInterval] = useState(initialSettings.crawl_interval_hours ?? 6);
  const [crawlChannels, setCrawlChannels] = useState(
    initialSettings.crawl_channels_active ?? { mediajob: true, arang: true, kbs: true }
  );
  const [blockedUrls, setBlockedUrls] = useState<BlockedUrlItem[]>(initialBlockedUrls);
  const [removingUrl, setRemovingUrl] = useState<string | null>(null);

  // 4. CRM & 학원 정책 관련 State
  const [crmRetention, setCrmRetention] = useState(initialSettings.crm_retention_days ?? 60);
  const [studyDeposit, setStudyDeposit] = useState(initialSettings.study_deposit_amount ?? 30000);
  const [studyPenalty, setStudyPenalty] = useState(initialSettings.study_penalty_amount ?? 5000);

  // 토스트 메시지 알림 State
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // useAsyncAction 훅 (섹션별 독립 로딩 상태)
  const profileAction = useAsyncAction();
  const aiAction = useAsyncAction();
  const crawlAction = useAsyncAction();
  const crmAction = useAsyncAction();
  const removeUrlAction = useAsyncAction();

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // 닉네임 저장
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    profileAction.runAction(async () => {
      const result = await updateProfileName(displayName);
      if (result.success) {
        showToast("success", "프로필 닉네임이 성공적으로 변경되었습니다.");
      } else {
        showToast("error", result.error ?? "프로필 변경 도중 오류가 발생했습니다.");
      }
    });
  };

  // AI 큐레이션 설정 저장
  const handleSaveAiSettings = () => {
    aiAction.runAction(async () => {
      const res1 = await updateSystemSetting("ai_filter_enabled", aiFilterEnabled);
      const res2 = await updateSystemSetting("ai_match_threshold", aiMatchThreshold);
      if (res1.success && res2.success) {
        showToast("success", "AI 자동 큐레이션 임계치 및 필터 설정이 저장되었습니다.");
      } else {
        showToast("error", res1.error ?? res2.error ?? "AI 설정 중 오류가 발생했습니다.");
      }
    });
  };

  // 크롤링 채널/주기 설정 저장
  const handleSaveCrawlSettings = () => {
    crawlAction.runAction(async () => {
      const res1 = await updateSystemSetting("crawl_interval_hours", Number(crawlInterval));
      const res2 = await updateSystemSetting("crawl_channels_active", crawlChannels);
      if (res1.success && res2.success) {
        showToast("success", "크롤러 수집 주기 및 채널 설정이 성공적으로 동기화되었습니다.");
      } else {
        showToast("error", res1.error ?? res2.error ?? "크롤러 설정 중 오류가 발생했습니다.");
      }
    });
  };

  // 차단 소스 URL 삭제 (블랙리스트 해제)
  const handleRemoveBlockedUrl = (url: string) => {
    setRemovingUrl(url);
    removeUrlAction.runAction(async () => {
      const result = await removeBlockedUrl(url);
      setRemovingUrl(null);
      if (result.success) {
        setBlockedUrls((prev) => prev.filter((item) => item.source_url !== url));
        showToast("success", "차단된 소스 URL의 블랙리스트 해제가 완료되었습니다.");
      } else {
        showToast("error", result.error ?? "블랙리스트 해제 실패");
      }
    });
  };

  // CRM 및 스터디 벌금/보증금 설정 저장
  const handleSaveCrmSettings = () => {
    crmAction.runAction(async () => {
      const res1 = await updateSystemSetting("crm_retention_days", Number(crmRetention));
      const res2 = await updateSystemSetting("study_deposit_amount", Number(studyDeposit));
      const res3 = await updateSystemSetting("study_penalty_amount", Number(studyPenalty));
      if (res1.success && res2.success && res3.success) {
        showToast("success", "CRM 만료 정책 및 스터디 보증금/벌금 기준액 설정이 저장되었습니다.");
      } else {
        showToast("error", "학원 CRM/스터디 설정 중 일부 항목을 저장하지 못했습니다.");
      }
    });
  };

  // 권한 뱃지 스타일
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-rose-50 border border-rose-200 text-rose-700 font-extrabold shadow-sm";
      case "student":
        return "bg-periwinkle-50 border border-periwinkle-200 text-periwinkle-700 font-extrabold shadow-sm";
      default:
        return "bg-gray-50 border border-gray-200 text-gray-500 font-bold";
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === "admin") return "👑 아카데미 원장 / 관리자";
    if (role === "student") return "🎓 정회원 수강생";
    return " 준비생 / 게스트";
  };

  return (
    <div className="relative">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-2xl border p-4 text-sm font-semibold shadow-island animate-fadeIn flex items-center gap-2.5 ${
          toast.type === "success" 
            ? "border-emerald-200 bg-emerald-50 text-emerald-800" 
            : "border-red-200 bg-red-50 text-red-800"
        }`}>
          <HugeiconsIcon icon={toast.type === "success" ? CheckmarkCircle01Icon : Cancel01Icon} size={18} color="currentColor" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Grid: 탭 메뉴 & 콘텐츠 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Left column: 탭 버튼 목록 (PC Rail / Mobile Row) */}
        <div className="md:col-span-1 space-y-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm space-y-1">
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all rounded-full ${
                activeTab === "profile"
                  ? "bg-periwinkle-100 border border-periwinkle-200 text-periwinkle-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <HugeiconsIcon icon={UserIcon} size={18} color="currentColor" />
              <span>👤 프로필 설정</span>
            </button>

            {user.role === "admin" && (
              <>
                <button
                  onClick={() => setActiveTab("ai")}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all rounded-full ${
                    activeTab === "ai"
                      ? "bg-periwinkle-100 border border-periwinkle-200 text-periwinkle-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <HugeiconsIcon icon={DashboardSquare01Icon} size={18} color="currentColor" />
                  <span>🤖 AI 큐레이션</span>
                </button>

                <button
                  onClick={() => setActiveTab("crawl")}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all rounded-full ${
                    activeTab === "crawl"
                      ? "bg-periwinkle-100 border border-periwinkle-200 text-periwinkle-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <HugeiconsIcon icon={Settings01Icon} size={18} color="currentColor" />
                  <span>🕸️ 크롤링 허브</span>
                </button>

                <button
                  onClick={() => setActiveTab("crm")}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all rounded-full ${
                    activeTab === "crm"
                      ? "bg-periwinkle-100 border border-periwinkle-200 text-periwinkle-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <HugeiconsIcon icon={Briefcase01Icon} size={18} color="currentColor" />
                  <span>💼 CRM & 정책</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right column: 탭별 설정 뷰 */}
        <div className="md:col-span-3">
          
          {/* TAB 1: 프로필 설정 */}
          {activeTab === "profile" && (
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">개인 프로필 관리</h3>
                <p className="text-xs font-semibold text-gray-400 mt-1">
                  Speech-M 서비스 내부에서 다른 정회원 및 강사진에게 표시되는 계정 정보를 변경합니다.
                </p>
              </div>

              <div className="border-t border-gray-100 pt-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-gray-400 uppercase">이메일 계정 (ID)</span>
                    <p className="text-sm font-bold text-gray-800">{user.email}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs ${getRoleBadge(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="displayName" className="text-xs font-extrabold text-gray-500">
                      서비스 이름 / 닉네임
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="이름을 입력해 주세요"
                        className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm focus:border-periwinkle-500 focus:ring-1 focus:ring-periwinkle-500 outline-none transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={profileAction.isPending || displayName.trim() === (user.name ?? "")}
                        className="rounded-full bg-periwinkle-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-periwinkle-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shrink-0"
                      >
                        {profileAction.isPending ? "저장 중..." : "저장"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: AI 큐레이션 설정 (Admin 전용) */}
          {activeTab === "ai" && user.role === "admin" && (
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">AI 큐레이션 및 필터 설정</h3>
                  <p className="text-xs font-semibold text-gray-400 mt-1">
                    수집된 공고들을 방송인 직군 적합도 기준에 맞추어 검증하는 AI 엔진의 민감도와 작동 여부를 구성합니다.
                  </p>
                </div>
                <button
                    onClick={handleSaveAiSettings}
                    disabled={aiAction.isPending}
                    className="rounded-full bg-periwinkle-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-periwinkle-700 active:scale-[0.98] transition-all"
                  >
                    {aiAction.isPending ? "저장 중..." : "설정 저장"}
                  </button>
              </div>

              <div className="border-t border-gray-100 pt-6 space-y-6">
                {/* AI 활성화 토글 */}
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
                      onChange={(e) => setAiFilterEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-periwinkle-600"></div>
                  </label>
                </div>

                {/* AI 임계치 슬라이더 */}
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
                  <div className="flex items-center gap-4 pt-2">
                    <span className="text-xs font-bold text-gray-400">관대함 (0.50)</span>
                    <input
                      type="range"
                      min="0.50"
                      max="0.95"
                      step="0.05"
                      value={aiMatchThreshold}
                      onChange={(e) => setAiMatchThreshold(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-periwinkle-600"
                    />
                    <span className="text-xs font-bold text-gray-700">엄격함 (0.95)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 크롤링 허브 & 블랙리스트 (Admin 전용) */}
          {activeTab === "crawl" && user.role === "admin" && (
            <div className="space-y-6">
              {/* 상단: 크롤러 환경설정 */}
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">크롤링 허브 구성</h3>
                    <p className="text-xs font-semibold text-gray-400 mt-1">
                      공고를 파싱하는 수집기의 백그라운드 구동 주기와 수집 대상 소스를 활성화합니다.
                    </p>
                  </div>
                  <button
                      onClick={handleSaveCrawlSettings}
                      disabled={crawlAction.isPending}
                      className="rounded-full bg-periwinkle-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-periwinkle-700 active:scale-[0.98] transition-all"
                    >
                      {crawlAction.isPending ? "저장 중..." : "설정 저장"}
                    </button>
                </div>

                <div className="border-t border-gray-100 pt-6 space-y-6">
                  {/* 수집 주기 셀렉터 */}
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-gray-500">배치 수집 주기 설정</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[3, 6, 12, 24].map((hours) => (
                        <button
                          key={hours}
                          type="button"
                          onClick={() => setCrawlInterval(hours)}
                          className={`rounded-xl border p-3 text-center text-xs font-bold transition-all ${
                            crawlInterval === hours
                              ? "border-periwinkle-300 bg-periwinkle-50 text-periwinkle-700 font-extrabold"
                              : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {hours}시간마다
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 수집 대상 채널 스위치들 */}
                  <div className="space-y-3">
                    <label className="text-xs font-extrabold text-gray-500">활성 수집 채널</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(Object.keys(crawlChannels) as Array<keyof typeof crawlChannels>).map((channel) => (
                        <div
                          key={channel}
                          className="flex items-center justify-between p-3.5 rounded-2xl border border-gray-100 bg-gray-50/50"
                        >
                          <span className="text-xs font-extrabold text-gray-700 uppercase">
                            {channel === "mediajob" ? "💼 미디어잡" : channel === "arang" ? "☕ 아랑 카페" : "🏛️ 공공기관"}
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={crawlChannels[channel]}
                              onChange={(e) =>
                                setCrawlChannels((prev) => ({
                                  ...prev,
                                  [channel]: e.target.checked,
                                }))
                              }
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-periwinkle-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 하단: 차단된 소스 URL 관리 (블랙리스트) */}
              <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">수집 차단 블랙리스트 관리</h3>
                  <p className="text-xs font-semibold text-gray-400 mt-1">
                    원장님이 공고 관리 콘솔에서 하드 삭제 또는 제외 처리하여, 향후 크롤링 시 재유입되지 않도록 영구 필터링된 공고 원문 URL 목록입니다.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/50 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        <th className="px-6 py-4">차단된 원본 소스 URL</th>
                        <th className="px-6 py-4">등록 원인</th>
                        <th className="px-6 py-4">차단 일시</th>
                        <th className="px-6 py-4 text-right">차단 즉각 해제</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                      {blockedUrls.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-10 text-center text-gray-400 font-medium">
                            현재 수집 방지 차단된 블랙리스트 URL이 존재하지 않습니다.
                          </td>
                        </tr>
                      ) : (
                        blockedUrls.map((item) => (
                          <tr key={item.source_url} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-6 py-4 max-w-[280px] truncate font-medium text-gray-500">
                              <a
                                href={item.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-periwinkle-600 hover:underline"
                              >
                                {item.source_url}
                              </a>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                                {item.reason === "manual_delete" ? "수동 관리 삭제" : item.reason === "ttl_purge" ? "만료 스케줄러" : "만료 관리"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-[11px] font-medium text-gray-400">
                              {new Date(item.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right">
                              <button
                                  onClick={() => handleRemoveBlockedUrl(item.source_url)}
                                  disabled={removingUrl === item.source_url || removeUrlAction.isPending}
                                  className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0"
                                >
                                  {removingUrl === item.source_url ? "해제 중..." : "차단 해제"}
                                </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CRM & 학원 정책 (Admin 전용) */}
          {activeTab === "crm" && user.role === "admin" && (
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">CRM 정책 & 스터디 보증금 규칙</h3>
                  <p className="text-xs font-semibold text-gray-400 mt-1">
                    미등록 상담 신청서 자동 보존(retention) 만료 설정 및 정회원 스터디의 보증금/벌금 표준 금액을 커스텀하게 정의합니다.
                  </p>
                </div>
                <button
                  onClick={handleSaveCrmSettings}
                  disabled={crmAction.isPending}
                  className="rounded-full bg-periwinkle-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-periwinkle-700 active:scale-[0.98] transition-all"
                >
                  {crmAction.isPending ? "저장 중..." : "설정 저장"}
                </button>
              </div>

              <div className="border-t border-gray-100 pt-6 space-y-6">
                {/* CRM 데이터 보존(Retention) 설정 */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-gray-500">미등록 상담 신청 내역 자동 보존 주기</label>
                  <p className="text-[11px] font-semibold text-gray-400">
                    학원 미등록 상태인 신규 리드 데이터는 개인정보 보호 정책에 따라 지정된 보존 기간 이후 자동으로 안전하게 스크랩 영구 소멸 처리됩니다.
                  </p>
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {[30, 60, 90, 180].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setCrmRetention(days)}
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

                {/* 스터디 운영비 설정 */}
                <div className="space-y-4 pt-2">
                  <label className="text-xs font-extrabold text-gray-500">수강생 정회원 스터디 운영 규칙</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-gray-400">기본 스터디 참가 보증금 (원)</span>
                      <input
                        type="number"
                        value={studyDeposit}
                        onChange={(e) => setStudyDeposit(Number(e.target.value))}
                        className="w-full rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm focus:border-periwinkle-500 focus:ring-1 focus:ring-periwinkle-500 outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-gray-400">과제 미제출 / 지각 기본 벌금 (원)</span>
                      <input
                        type="number"
                        value={studyPenalty}
                        onChange={(e) => setStudyPenalty(Number(e.target.value))}
                        className="w-full rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm focus:border-periwinkle-500 focus:ring-1 focus:ring-periwinkle-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
