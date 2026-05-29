"use client";

/**
 * 시스템 통합 설정 뷰 컴포넌트.
 * 프로필/AI 큐레이션/크롤링/CRM 탭의 상태와 저장 액션을 조율한다.
 * 각 탭의 상세 UI는 하위 패널 컴포넌트에 위임한다.
 */

import { useState, type FormEvent } from "react";
import {
  removeBlockedUrl,
  updateProfileName,
  updateSystemSetting,
} from "@/app/(admin)/settings/actions";
import { useAsyncAction } from "@/lib/ui/use-async-action";
import { AiSettingsPanel } from "./ai-settings-panel";
import { CrawlSettingsPanel } from "./crawl-settings-panel";
import { CrmSettingsPanel } from "./crm-settings-panel";
import { ProfileSettingsPanel } from "./profile-settings-panel";
import { SettingsTabNav } from "./settings-tab-nav";
import { SettingsToast } from "./settings-toast";
import type {
  BlockedUrlItem,
  CrawlChannels,
  SettingsInitialValues,
  SettingsTab,
  ToastState,
  UserProfile,
} from "./settings-types";

interface SettingsViewProps {
  user: UserProfile;
  initialSettings: SettingsInitialValues;
  initialBlockedUrls: BlockedUrlItem[];
}

export function SettingsView({
  user,
  initialSettings,
  initialBlockedUrls,
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [displayName, setDisplayName] = useState(user.name ?? "");
  const [aiFilterEnabled, setAiFilterEnabled] = useState(
    initialSettings.ai_filter_enabled ?? true,
  );
  const [aiMatchThreshold, setAiMatchThreshold] = useState(
    initialSettings.ai_match_threshold ?? 0.75,
  );
  const [crawlInterval, setCrawlInterval] = useState(
    initialSettings.crawl_interval_hours ?? 6,
  );
  const [crawlChannels, setCrawlChannels] = useState<CrawlChannels>(
    initialSettings.crawl_channels_active ?? { mediajob: true, arang: true, kbs: true },
  );
  const [blockedUrls, setBlockedUrls] = useState<BlockedUrlItem[]>(initialBlockedUrls);
  const [removingUrl, setRemovingUrl] = useState<string | null>(null);
  const [crmRetention, setCrmRetention] = useState(
    initialSettings.crm_retention_days ?? 60,
  );
  const [studyDeposit, setStudyDeposit] = useState(
    initialSettings.study_deposit_amount ?? 30000,
  );
  const [studyPenalty, setStudyPenalty] = useState(
    initialSettings.study_penalty_amount ?? 5000,
  );
  const [toast, setToast] = useState<ToastState>(null);

  const profileAction = useAsyncAction();
  const aiAction = useAsyncAction();
  const crawlAction = useAsyncAction();
  const crmAction = useAsyncAction();
  const removeUrlAction = useAsyncAction();

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    profileAction.runAction(async () => {
      const result = await updateProfileName(displayName);
      if (result.success) {
        showToast("success", "프로필 닉네임이 성공적으로 변경되었습니다.");
        return;
      }
      showToast("error", result.error ?? "프로필 변경 도중 오류가 발생했습니다.");
    });
  };

  const handleSaveAiSettings = () => {
    aiAction.runAction(async () => {
      const res1 = await updateSystemSetting("ai_filter_enabled", aiFilterEnabled);
      const res2 = await updateSystemSetting("ai_match_threshold", aiMatchThreshold);
      if (res1.success && res2.success) {
        showToast("success", "AI 자동 큐레이션 임계치 및 필터 설정이 저장되었습니다.");
        return;
      }
      showToast("error", res1.error ?? res2.error ?? "AI 설정 중 오류가 발생했습니다.");
    });
  };

  const handleSaveCrawlSettings = () => {
    crawlAction.runAction(async () => {
      const res1 = await updateSystemSetting("crawl_interval_hours", Number(crawlInterval));
      const res2 = await updateSystemSetting("crawl_channels_active", crawlChannels);
      if (res1.success && res2.success) {
        showToast("success", "크롤러 수집 주기 및 채널 설정이 성공적으로 동기화되었습니다.");
        return;
      }
      showToast("error", res1.error ?? res2.error ?? "크롤러 설정 중 오류가 발생했습니다.");
    });
  };

  const handleRemoveBlockedUrl = (url: string) => {
    setRemovingUrl(url);
    removeUrlAction.runAction(async () => {
      const result = await removeBlockedUrl(url);
      setRemovingUrl(null);
      if (result.success) {
        setBlockedUrls((prev) => prev.filter((item) => item.source_url !== url));
        showToast("success", "차단된 소스 URL의 블랙리스트 해제가 완료되었습니다.");
        return;
      }
      showToast("error", result.error ?? "블랙리스트 해제 실패");
    });
  };

  const handleSaveCrmSettings = () => {
    crmAction.runAction(async () => {
      const res1 = await updateSystemSetting("crm_retention_days", Number(crmRetention));
      const res2 = await updateSystemSetting("study_deposit_amount", Number(studyDeposit));
      const res3 = await updateSystemSetting("study_penalty_amount", Number(studyPenalty));
      if (res1.success && res2.success && res3.success) {
        showToast("success", "CRM 만료 정책 및 스터디 보증금/벌금 기준액 설정이 저장되었습니다.");
        return;
      }
      showToast("error", "학원 CRM/스터디 설정 중 일부 항목을 저장하지 못했습니다.");
    });
  };

  return (
    <div className="relative">
      <SettingsToast toast={toast} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:gap-6">
        <SettingsTabNav
          activeTab={activeTab}
          role={user.role}
          onTabChange={setActiveTab}
        />

        <div className="md:col-span-3">
          {activeTab === "profile" && (
            <ProfileSettingsPanel
              user={user}
              displayName={displayName}
              isPending={profileAction.isPending}
              onDisplayNameChange={setDisplayName}
              onSubmit={handleSaveProfile}
            />
          )}

          {activeTab === "ai" && user.role === "admin" && (
            <AiSettingsPanel
              aiFilterEnabled={aiFilterEnabled}
              aiMatchThreshold={aiMatchThreshold}
              isPending={aiAction.isPending}
              onAiFilterEnabledChange={setAiFilterEnabled}
              onAiMatchThresholdChange={setAiMatchThreshold}
              onSave={handleSaveAiSettings}
            />
          )}

          {activeTab === "crawl" && user.role === "admin" && (
            <CrawlSettingsPanel
              crawlInterval={crawlInterval}
              crawlChannels={crawlChannels}
              blockedUrls={blockedUrls}
              removingUrl={removingUrl}
              isSaving={crawlAction.isPending}
              isRemoving={removeUrlAction.isPending}
              onCrawlIntervalChange={setCrawlInterval}
              onChannelChange={(channel, checked) =>
                setCrawlChannels((prev) => ({ ...prev, [channel]: checked }))
              }
              onSave={handleSaveCrawlSettings}
              onRemoveBlockedUrl={handleRemoveBlockedUrl}
            />
          )}

          {activeTab === "crm" && user.role === "admin" && (
            <CrmSettingsPanel
              crmRetention={crmRetention}
              studyDeposit={studyDeposit}
              studyPenalty={studyPenalty}
              isPending={crmAction.isPending}
              onCrmRetentionChange={setCrmRetention}
              onStudyDepositChange={setStudyDeposit}
              onStudyPenaltyChange={setStudyPenalty}
              onSave={handleSaveCrmSettings}
            />
          )}
        </div>
      </div>
    </div>
  );
}
