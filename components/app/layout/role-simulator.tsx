"use client";

import { useState, useSyncExternalStore } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserSettings01Icon,
  CrownIcon,
  UserIcon,
  Logout01Icon,
  RefreshIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";

type SimulatedRole = "admin" | "student" | "guest" | "none" | "actual";

function getMockRoleFromCookie(): SimulatedRole {
  const cookies = document.cookie.split("; ");
  const mockRoleCookie = cookies.find((row) => row.startsWith("mock_role="));
  if (mockRoleCookie) {
    return mockRoleCookie.split("=")[1] as SimulatedRole;
  }
  return "actual";
}

const subscribeNoop = () => () => {};

export function RoleSimulator() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSimulated, setCurrentSimulated] = useState<SimulatedRole>(() =>
    typeof window === "undefined" ? "actual" : getMockRoleFromCookie()
  );
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false);

  // 개발 모드가 아니면 화면에 전혀 표시하지 않음
  if (!isClient || process.env.NODE_ENV === "production") {
    return null;
  }

  const handleRoleChange = (role: SimulatedRole) => {
    if (role === "actual") {
      // 쿠키 삭제하여 본래 세션으로 복구
      document.cookie = "mock_role=; path=/; max-age=0";
    } else {
      // 쿠키 구워서 모킹 적용
      document.cookie = `mock_role=${role}; path=/; max-age=86400`;
    }
    setCurrentSimulated(role);
    window.location.reload();
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans antialiased">
      {/* Floating Toggle Button */}
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-periwinkle-600 to-indigo-600 text-white shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 animate-bounce hover:animate-none"
          title="등급 권한 시뮬레이터 열기"
        >
          <HugeiconsIcon icon={UserSettings01Icon} size={20} color="currentColor" strokeWidth={1.8} />
          {currentSimulated !== "actual" && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[8px] font-extrabold text-white ring-2 ring-white">
              !
            </span>
          )}
        </button>
      ) : (
        /* Glassmorphism Simulator Control Panel */
        <div className="w-72 rounded-3xl border border-white/20 bg-white/80 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.15)] backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-200/50">
            <div className="flex items-center gap-2">
              <span className="text-xs">🎙️</span>
              <div>
                <h4 className="text-xs font-black text-gray-800 leading-tight">Speech-M Simulator</h4>
                <p className="text-[10px] text-gray-400 font-medium leading-none mt-0.5">실시간 등급 화면 모킹</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={14} color="currentColor" />
            </button>
          </div>

          {/* Role Choice Buttons */}
          <div className="mt-4 space-y-2">
            {/* 1. Admin */}
            <button
              onClick={() => handleRoleChange("admin")}
              className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-all ${
                currentSimulated === "admin"
                  ? "border-periwinkle-500 bg-periwinkle-50 text-periwinkle-700 shadow-sm"
                  : "border-gray-200/60 bg-white hover:border-gray-300 hover:bg-gray-50/50 text-gray-700"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-500 border border-amber-100">
                <HugeiconsIcon icon={CrownIcon} size={15} color="currentColor" strokeWidth={1.8} />
              </span>
              <div className="flex-1">
                <div className="text-[11px] font-black leading-tight">👑 원장 / 관리자 (Admin)</div>
                <div className="text-[9px] text-gray-400 font-semibold leading-none mt-0.5">대시보드 콘솔 및 회원 등업 제어 가능</div>
              </div>
            </button>

            {/* 2. Student */}
            <button
              onClick={() => handleRoleChange("student")}
              className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-all ${
                currentSimulated === "student"
                  ? "border-periwinkle-500 bg-periwinkle-50 text-periwinkle-700 shadow-sm"
                  : "border-gray-200/60 bg-white hover:border-gray-300 hover:bg-gray-50/50 text-gray-700"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 border border-indigo-100">
                <HugeiconsIcon icon={UserIcon} size={15} color="currentColor" strokeWidth={1.8} />
              </span>
              <div className="flex-1">
                <div className="text-[11px] font-black leading-tight">🎓 정회원 수강생 (Student)</div>
                <div className="text-[9px] text-gray-400 font-semibold leading-none mt-0.5">연습원고 & 포트폴리오실, 피드백 열람</div>
              </div>
            </button>

            {/* 3. Guest */}
            <button
              onClick={() => handleRoleChange("guest")}
              className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-all ${
                currentSimulated === "guest"
                  ? "border-periwinkle-500 bg-periwinkle-50 text-periwinkle-700 shadow-sm"
                  : "border-gray-200/60 bg-white hover:border-gray-300 hover:bg-gray-50/50 text-gray-700"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-500 border border-slate-100">
                <HugeiconsIcon icon={UserIcon} size={15} color="currentColor" strokeWidth={1.8} />
              </span>
              <div className="flex-1">
                <div className="text-[11px] font-black leading-tight">👤 일반 게스트 (Guest)</div>
                <div className="text-[9px] text-gray-400 font-semibold leading-none mt-0.5">승인 대기 상태 대시보드, 채용공고만 허용</div>
              </div>
            </button>

            {/* 4. Non-logged-in */}
            <button
              onClick={() => handleRoleChange("none")}
              className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-all ${
                currentSimulated === "none"
                  ? "border-periwinkle-500 bg-periwinkle-50 text-periwinkle-700 shadow-sm"
                  : "border-gray-200/60 bg-white hover:border-gray-300 hover:bg-gray-50/50 text-gray-700"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-500 border border-red-100">
                <HugeiconsIcon icon={Logout01Icon} size={15} color="currentColor" strokeWidth={1.8} />
              </span>
              <div className="flex-1">
                <div className="text-[11px] font-black leading-tight">❌ 비로그인 상태 (Guest)</div>
                <div className="text-[9px] text-gray-400 font-semibold leading-none mt-0.5">게스트와 동일하나 세션조차 없는 상태 모사</div>
              </div>
            </button>
          </div>

          {/* Reset button to restore actual session */}
          {currentSimulated !== "actual" && (
            <button
              onClick={() => handleRoleChange("actual")}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-800 py-2 text-[10px] font-black text-white hover:bg-slate-900 transition-colors shadow-sm"
            >
              <HugeiconsIcon icon={RefreshIcon} size={11} color="currentColor" />
              <span>🔄 원래 로그인 계정 권한으로 복구</span>
            </button>
          )}

          <div className="mt-2 text-[9px] text-center text-gray-400 font-medium leading-normal">
            💡 전환 시 즉시 페이지가 리로드되며 해당 등급의 내비게이션과 권한이 적용됩니다.
          </div>
        </div>
      )}
    </div>
  );
}
