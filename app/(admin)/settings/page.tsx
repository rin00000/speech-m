import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { Header } from "@/components/admin/layout/header";
import { SettingsView } from "@/components/admin/settings/settings-view";
import { HugeiconsIcon } from "@hugeicons/react";
import { LockIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";

interface BlockedUrlItem {
  source_url: string;
  reason: string | null;
  created_at: string;
}

type InitialSettings = {
  ai_filter_enabled?: boolean;
  ai_match_threshold?: number;
  crawl_interval_hours?: number;
  crawl_channels_active?: { mediajob: boolean; arang: boolean; kbs: boolean };
  crm_retention_days?: number;
  study_deposit_amount?: number;
  study_penalty_amount?: number;
};

function parseInitialSettings(raw: Record<string, unknown>): InitialSettings {
  const channels = raw.crawl_channels_active;
  const channelRecord =
    channels && typeof channels === "object" && !Array.isArray(channels)
      ? (channels as Record<string, unknown>)
      : null;

  return {
    ai_filter_enabled:
      typeof raw.ai_filter_enabled === "boolean" ? raw.ai_filter_enabled : undefined,
    ai_match_threshold:
      typeof raw.ai_match_threshold === "number" ? raw.ai_match_threshold : undefined,
    crawl_interval_hours:
      typeof raw.crawl_interval_hours === "number" ? raw.crawl_interval_hours : undefined,
    crawl_channels_active: channelRecord
      ? {
          mediajob: Boolean(channelRecord.mediajob),
          arang: Boolean(channelRecord.arang),
          kbs: Boolean(channelRecord.kbs),
        }
      : undefined,
    crm_retention_days:
      typeof raw.crm_retention_days === "number" ? raw.crm_retention_days : undefined,
    study_deposit_amount:
      typeof raw.study_deposit_amount === "number" ? raw.study_deposit_amount : undefined,
    study_penalty_amount:
      typeof raw.study_penalty_amount === "number" ? raw.study_penalty_amount : undefined,
  };
}

export default async function SettingsPage() {
  const user = await getCurrentUser();

  // 비로그인 상태일 경우 로그인 유도 또는 대시보드 리다이렉트
  if (!user) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Header
          title="시스템 통합 설정"
          description="서비스를 안전하고 쾌적하게 운영하기 위한 핵심 정책 제어 콘솔입니다."
        />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-gray-50/30 p-6">
          <div className="max-w-md w-full rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-6">
              <HugeiconsIcon icon={LockIcon} size={28} color="currentColor" strokeWidth={1.8} />
            </span>
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">로그인이 필요합니다</h2>
            <p className="mt-3 text-sm font-medium text-gray-500 leading-relaxed">
              설정 콘솔을 이용하시려면 정회원 또는 관리자 계정으로 로그인해 주셔야 합니다.
            </p>
            <div className="mt-8">
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-periwinkle-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition-all hover:bg-periwinkle-700"
              >
                로그인 화면으로 가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === "admin";
  const isStudent = user.role === "student";

  // 게스트(guest) 권한은 차단 메시지 노출 (수강생과 관리자만 설정 접근 가능)
  if (!isAdmin && !isStudent) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Header
          title="시스템 통합 설정"
          description="서비스를 안전하고 쾌적하게 운영하기 위한 핵심 정책 제어 콘솔입니다."
        />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-gradient-to-br from-slate-50 to-rose-50/10 p-6">
          <div className="max-w-md w-full rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-lg relative overflow-hidden">
            <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-rose-100/50 blur-2xl" />
            <span className="relative z-10 inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-6 shadow-sm">
              <HugeiconsIcon icon={LockIcon} size={28} color="currentColor" strokeWidth={1.8} />
            </span>
            <h2 className="relative z-10 text-xl font-extrabold text-gray-900 tracking-tight">접근 권한이 없습니다</h2>
            <p className="relative z-10 mt-3 text-sm font-medium text-gray-500 leading-relaxed">
              본 설정 페이지는 **&apos;아카데미 수강생(student)&apos;** 또는 **&apos;원장님(admin)&apos;** 권한을 부여받은 정회원 계정만 접근할 수 있는 제한 구역입니다.
            </p>
            <div className="mt-8 flex flex-col gap-3 relative z-10">
              <Link
                href="/dashboard"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-periwinkle-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition-all hover:bg-periwinkle-700"
              >
                나의 대시보드로 이동
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 1. Supabase에서 전역 시스템 설정 병렬 fetch
  const supabase = createAdminClient();
  const settingsPromise = supabase.from("system_settings").select("key, value");

  // 2. 관리자인 경우에만 차단된 소스 URL 목록 fetch
  const blockedUrlsPromise = isAdmin
    ? supabase
        .from("crawl_blocked_source_urls")
        .select("source_url, reason, created_at")
        .order("created_at", { ascending: false })
    : Promise.resolve({ data: [], error: null });

  // 병렬 수행
  const [settingsRes, blockedUrlsRes] = await Promise.all([settingsPromise, blockedUrlsPromise]);

  if (settingsRes.error) {
    console.error("Fetch system settings error:", settingsRes.error);
  }

  // 설정을 key-value 객체로 플래닝
  const systemSettings: Record<string, unknown> = {};
  if (settingsRes.data) {
    for (const row of settingsRes.data) {
      systemSettings[row.key] = row.value;
    }
  }

  const blockedUrls = (blockedUrlsRes.data ?? []) as BlockedUrlItem[];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title="시스템 통합 설정"
        description="가입자 프로필 관리와 AI 큐레이션 민감도, 백그라운드 수집 주기, 블랙리스트 연동 등 아카데미 운영의 핵심 정책을 제어합니다."
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <SettingsView
          user={{
            email: user.email ?? "",
            name: user.name,
            role: user.role,
          }}
          initialSettings={parseInitialSettings(systemSettings)}
          initialBlockedUrls={blockedUrls}
        />
      </div>
    </div>
  );
}
