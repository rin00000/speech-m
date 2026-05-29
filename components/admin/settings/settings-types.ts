/**
 * 설정 화면 하위 컴포넌트가 공유하는 사용자, 탭, 설정 값 타입.
 * SettingsView는 이 타입을 기준으로 상태를 보관하고 각 패널에 필요한 값만 넘긴다.
 */

export type SettingsTab = "profile" | "ai" | "crawl" | "crm";

export type UserProfile = {
  email: string;
  name: string | null;
  role: "admin" | "student" | "guest";
};

export type CrawlChannels = {
  mediajob: boolean;
  arang: boolean;
  kbs: boolean;
};

export type BlockedUrlItem = {
  source_url: string;
  reason: string | null;
  created_at: string;
};

export type SettingsInitialValues = {
  ai_filter_enabled?: boolean;
  ai_match_threshold?: number;
  crawl_interval_hours?: number;
  crawl_channels_active?: CrawlChannels;
  crm_retention_days?: number;
  study_deposit_amount?: number;
  study_penalty_amount?: number;
};

export type ToastState = {
  type: "success" | "error";
  message: string;
} | null;
