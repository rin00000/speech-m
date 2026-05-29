"use client";

/**
 * 크롤링 설정과 수집 차단 URL 목록을 관리하는 탭.
 * 크롤 주기/채널 입력과 블랙리스트 해제 UI를 한 화면 안에서 분리해 담당한다.
 */

import type { BlockedUrlItem, CrawlChannels } from "./settings-types";

const getBlockedReasonLabel = (reason: string | null) => {
  if (reason === "manual_delete") return "수동 관리 삭제";
  if (reason === "ttl_purge") return "만료 스케줄러";
  return "만료 관리";
};

const getChannelLabel = (channel: keyof CrawlChannels) => {
  if (channel === "mediajob") return "💼 미디어잡";
  if (channel === "arang") return "☕ 아랑 카페";
  return "🏛️ 공공기관";
};

export const CrawlSettingsPanel = ({
  crawlInterval,
  crawlChannels,
  blockedUrls,
  removingUrl,
  isSaving,
  isRemoving,
  onCrawlIntervalChange,
  onChannelChange,
  onSave,
  onRemoveBlockedUrl,
}: {
  crawlInterval: number;
  crawlChannels: CrawlChannels;
  blockedUrls: BlockedUrlItem[];
  removingUrl: string | null;
  isSaving: boolean;
  isRemoving: boolean;
  onCrawlIntervalChange: (hours: number) => void;
  onChannelChange: (channel: keyof CrawlChannels, checked: boolean) => void;
  onSave: () => void;
  onRemoveBlockedUrl: (url: string) => void;
}) => {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:space-y-6 md:rounded-3xl md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">크롤링 허브 구성</h3>
            <p className="text-xs font-semibold text-gray-400 mt-1">
              공고를 파싱하는 수집기의 백그라운드 구동 주기와 수집 대상 소스를 활성화합니다.
            </p>
          </div>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="rounded-full bg-periwinkle-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-periwinkle-700 active:scale-[0.98] sm:py-2"
          >
            {isSaving ? "저장 중..." : "설정 저장"}
          </button>
        </div>

        <div className="border-t border-gray-100 pt-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-gray-500">배치 수집 주기 설정</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[3, 6, 12, 24].map((hours) => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => onCrawlIntervalChange(hours)}
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

          <div className="space-y-3">
            <label className="text-xs font-extrabold text-gray-500">활성 수집 채널</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(Object.keys(crawlChannels) as Array<keyof CrawlChannels>).map((channel) => (
                <div
                  key={channel}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-gray-100 bg-gray-50/50"
                >
                  <span className="text-xs font-extrabold text-gray-700 uppercase">
                    {getChannelLabel(channel)}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={crawlChannels[channel]}
                      onChange={(event) => onChannelChange(channel, event.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-periwinkle-600" />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:rounded-3xl">
        <div className="border-b border-gray-100 p-4 md:p-6">
          <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">수집 차단 블랙리스트 관리</h3>
          <p className="text-xs font-semibold text-gray-400 mt-1">
            원장님이 공고 관리 콘솔에서 하드 삭제 또는 제외 처리하여, 향후 크롤링 시 재유입되지 않도록 영구 필터링된 공고 원문 URL 목록입니다.
          </p>
        </div>

        <div className="divide-y divide-gray-100 md:hidden">
          {blockedUrls.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm font-medium text-gray-400">
              현재 수집 방지 차단 URL이 없습니다.
            </div>
          ) : (
            blockedUrls.map((item) => (
              <article key={item.source_url} className="space-y-3 p-4">
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block break-all text-sm font-semibold leading-snug text-periwinkle-700"
                >
                  {item.source_url}
                </a>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                    {getBlockedReasonLabel(item.reason)}
                  </span>
                  <span className="text-[11px] font-medium text-gray-400">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => onRemoveBlockedUrl(item.source_url)}
                  disabled={removingUrl === item.source_url || isRemoving}
                  className="w-full rounded-full border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  {removingUrl === item.source_url ? "해제 중..." : "차단 해제"}
                </button>
              </article>
            ))
          )}
        </div>
        <div className="hidden overflow-x-auto md:block">
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
                        {getBlockedReasonLabel(item.reason)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[11px] font-medium text-gray-400">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={() => onRemoveBlockedUrl(item.source_url)}
                        disabled={removingUrl === item.source_url || isRemoving}
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
  );
};
