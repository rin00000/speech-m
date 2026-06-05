"use client";

/**
 * 개발 모드에서만 노출되는 사용자 페르소나 전환 패널.
 * 운영 세션 로직과 분리된 mock_role 쿠키로 권한별 화면과 릴레이 순서를 확인한다.
 */

import { useState, useSyncExternalStore } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  CrownIcon,
  Logout01Icon,
  RefreshIcon,
  UserIcon,
  UserSettings01Icon,
} from "@hugeicons/core-free-icons";
import {
  DEV_PERSONA_COOKIE_VALUES,
  DEV_PERSONA_OPTIONS,
  type DevPersonaCookieValue,
} from "@/lib/auth/dev-personas";

const SIGNED_OUT_OPTION = {
  id: "none",
  label: "Signed out",
  detail: "No session",
} as const;

const SIMULATOR_OPTIONS: {
  id: Exclude<DevPersonaCookieValue, "actual">;
  label: string;
  detail: string;
  icon: typeof UserIcon;
  iconClassName: string;
}[] = [
  ...DEV_PERSONA_OPTIONS.map((persona) => ({
    id: persona.id,
    label: persona.label,
    detail: persona.email,
    icon: persona.role === "admin" ? CrownIcon : UserIcon,
    iconClassName:
      persona.id === "admin"
        ? "border-amber-100 bg-amber-50 text-amber-500"
        : persona.id === "student"
          ? "border-periwinkle-100 bg-periwinkle-50 text-periwinkle-700"
          : persona.id === "student2"
            ? "border-emerald-100 bg-emerald-50 text-emerald-600"
            : "border-gray-200 bg-gray-50 text-gray-600",
  })),
  {
    ...SIGNED_OUT_OPTION,
    icon: Logout01Icon,
    iconClassName: "border-red-100 bg-red-50 text-red-500",
  },
];

function getMockRoleFromCookie(): DevPersonaCookieValue {
  const cookies = document.cookie.split("; ");
  const mockRoleCookie = cookies.find((row) => row.startsWith("mock_role="));
  const cookieValue = mockRoleCookie?.split("=")[1] as DevPersonaCookieValue | undefined;
  if (cookieValue && DEV_PERSONA_COOKIE_VALUES.has(cookieValue)) return cookieValue;
  return "actual";
}

const subscribeNoop = () => () => {};

export function DevRoleSimulator() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSimulated, setCurrentSimulated] = useState<DevPersonaCookieValue>(() =>
    typeof window === "undefined" ? "actual" : getMockRoleFromCookie()
  );
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);

  if (!isClient || process.env.NODE_ENV === "production") {
    return null;
  }

  const handleRoleChange = (role: DevPersonaCookieValue) => {
    if (role === "actual") {
      // eslint-disable-next-line react-hooks/immutability -- dev-only cookie switcher.
      document.cookie = "mock_role=; path=/; max-age=0";
    } else {
      // eslint-disable-next-line react-hooks/immutability -- dev-only cookie switcher.
      document.cookie = `mock_role=${role}; path=/; max-age=86400`;
    }
    setCurrentSimulated(role);
    window.location.reload();
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans antialiased">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-periwinkle-600 text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
          title="Open role simulator"
        >
          <HugeiconsIcon icon={UserSettings01Icon} size={20} color="currentColor" strokeWidth={1.8} />
          {currentSimulated !== "actual" && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-extrabold leading-none text-white ring-2 ring-white">
              !
            </span>
          )}
        </button>
      ) : (
        <div className="w-72 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div>
              <h4 className="text-xs font-black leading-tight text-gray-800">Speech-M Simulator</h4>
              <p className="mt-0.5 text-[10px] font-medium leading-none text-gray-400">
                Dev-only persona switcher
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              title="Close"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={14} color="currentColor" />
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {SIMULATOR_OPTIONS.map((persona) => {
              const isSelected = currentSimulated === persona.id;
              return (
                <button
                  key={persona.id}
                  onClick={() => handleRoleChange(persona.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-colors ${
                    isSelected
                      ? "border-periwinkle-500 bg-periwinkle-50 text-periwinkle-700"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full border ${persona.iconClassName}`}
                  >
                    <HugeiconsIcon icon={persona.icon} size={15} color="currentColor" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-black leading-tight">
                      {persona.label}
                    </span>
                    <span className="mt-0.5 block truncate text-[9px] font-semibold leading-none text-gray-400">
                      {persona.detail}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {currentSimulated !== "actual" && (
            <button
              onClick={() => handleRoleChange("actual")}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-gray-900 py-2 text-[10px] font-black text-white transition-colors hover:bg-gray-800"
            >
              <HugeiconsIcon icon={RefreshIcon} size={11} color="currentColor" />
              <span>Restore actual session</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
