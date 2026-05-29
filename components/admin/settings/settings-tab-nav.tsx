"use client";

/**
 * 설정 화면의 좌측 탭 네비게이션.
 * 권한별로 노출 가능한 탭을 제한하고 선택 상태 스타일을 한곳에서 관리한다.
 */

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Briefcase01Icon,
  DashboardSquare01Icon,
  Settings01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import type { SettingsTab, UserProfile } from "./settings-types";

const tabItems = [
  { id: "profile", label: "👤 프로필 설정", icon: UserIcon, adminOnly: false },
  { id: "ai", label: "🤖 AI 큐레이션", icon: DashboardSquare01Icon, adminOnly: true },
  { id: "crawl", label: "🕸️ 크롤링 허브", icon: Settings01Icon, adminOnly: true },
  { id: "crm", label: "💼 CRM & 정책", icon: Briefcase01Icon, adminOnly: true },
] satisfies Array<{
  id: SettingsTab;
  label: string;
  icon: typeof UserIcon;
  adminOnly: boolean;
}>;

export const SettingsTabNav = ({
  activeTab,
  role,
  onTabChange,
}: {
  activeTab: SettingsTab;
  role: UserProfile["role"];
  onTabChange: (tab: SettingsTab) => void;
}) => {
  return (
    <div className="space-y-2 md:col-span-1">
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-sm md:block md:space-y-1 md:rounded-3xl md:p-3">
        {tabItems
          .filter((item) => !item.adminOnly || role === "admin")
          .map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition-all md:w-full md:gap-3 md:py-3 md:text-sm ${
                activeTab === item.id
                  ? "bg-periwinkle-100 border border-periwinkle-200 text-periwinkle-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <HugeiconsIcon icon={item.icon} size={18} color="currentColor" />
              <span>{item.label}</span>
            </button>
          ))}
      </div>
    </div>
  );
};
