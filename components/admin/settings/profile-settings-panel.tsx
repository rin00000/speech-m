"use client";

import type { FormEvent } from "react";
import { LogoutButton } from "@/components/app/layout/logout-button";
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
  if (role === "admin") return "관리자";
  if (role === "student") return "정회원 수강생";
  return "준비생 / 게스트";
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
    <div className="space-y-5 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:space-y-6 md:p-6">
      <div>
        <h3 className="text-lg font-extrabold tracking-tight text-gray-900">개인 프로필 관리</h3>
        <p className="mt-1 text-xs font-semibold text-gray-400">
          서비스 안에서 표시되는 이름과 계정 정보를 확인합니다.
        </p>
      </div>

      <div className="space-y-4 border-t border-gray-100 pt-6">
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 sm:flex-row sm:items-center">
          <div className="min-w-0 space-y-1">
            <span className="text-[11px] font-bold uppercase text-gray-400">내부 사용자 ID</span>
            <p className="break-all text-xs font-bold text-gray-700">{user.userId}</p>
            <span className="mt-3 block text-[11px] font-bold uppercase text-gray-400">
              연락처 이메일
            </span>
            <p className="break-all text-sm font-bold text-gray-800">{user.email ?? "미등록"}</p>
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
                placeholder="이름을 입력하세요"
                className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm outline-none transition-colors focus:border-periwinkle-500 focus:ring-1 focus:ring-periwinkle-500"
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

        <div className="border-t border-gray-100 pt-4 md:hidden">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
};
