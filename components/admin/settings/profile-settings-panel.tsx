"use client";

/**
 * 사용자 프로필 설정 탭.
 * 이메일/권한 배지 표시와 닉네임 저장 폼만 담당한다.
 */

import type { FormEvent } from "react";
import type { UserProfile } from "./settings-types";

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

export const ProfileSettingsPanel = ({
  user,
  displayName,
  isPending,
  onDisplayNameChange,
  onSubmit,
}: {
  user: UserProfile;
  displayName: string;
  isPending: boolean;
  onDisplayNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) => {
  return (
    <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:space-y-6 md:rounded-3xl md:p-6">
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

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="displayName" className="text-xs font-extrabold text-gray-500">
              서비스 이름 / 닉네임
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(event) => onDisplayNameChange(event.target.value)}
                placeholder="이름을 입력해 주세요"
                className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm focus:border-periwinkle-500 focus:ring-1 focus:ring-periwinkle-500 outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={isPending || displayName.trim() === (user.name ?? "")}
                className="shrink-0 rounded-full bg-periwinkle-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-periwinkle-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              >
                {isPending ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
