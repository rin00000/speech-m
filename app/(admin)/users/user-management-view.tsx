"use client";

import { useState } from "react";
import { updateUserRole } from "./actions";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";

interface ProfileItem {
  email: string;
  role: "admin" | "student" | "guest";
  display_name: string | null;
  created_at: string;
}

export function UserManagementView({ initialUsers }: { initialUsers: ProfileItem[] }) {
  const [users, setUsers] = useState<ProfileItem[]>(initialUsers);
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRoleChange = async (email: string, targetRole: "admin" | "student" | "guest") => {
    setLoadingEmail(email);
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await updateUserRole(email, targetRole);

    if (result.success) {
      setUsers((prev) =>
        prev.map((u) => (u.email === email ? { ...u, role: targetRole } : u))
      );
      setSuccessMsg(`${email} 계정의 권한이 [${targetRole === "admin" ? "관리자" : targetRole === "student" ? "수강생" : "게스트"}]으로 성공적으로 변경되었습니다.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(result.error ?? "권한 변경 도중 문제가 발생했습니다.");
    }
    setLoadingEmail(null);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-rose-50 border border-rose-200 text-rose-700 font-bold";
      case "student":
        return "bg-periwinkle-50 border border-periwinkle-200 text-periwinkle-700 font-bold";
      default:
        return "bg-gray-50 border border-gray-200 text-gray-500 font-semibold";
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === "admin") return "👑 원장 / 관리자";
    if (role === "student") return "🎓 정회원 수강생";
    return " 준비생 / 게스트";
  };

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
      {successMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 flex items-center gap-2.5 animate-fadeIn">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} color="currentColor" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 flex items-center gap-2.5">
          <HugeiconsIcon icon={Cancel01Icon} size={18} color="currentColor" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">전체 가입자</span>
          <p className="mt-1 text-2xl font-extrabold text-gray-900 tabular-nums">{users.length}명</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">🎓 수강생 정회원</span>
          <p className="mt-1 text-2xl font-extrabold text-periwinkle-600 tabular-nums">
            {users.filter((u) => u.role === "student").length}명
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider"> 대기 승인 게스트</span>
          <p className="mt-1 text-2xl font-extrabold text-amber-600 tabular-nums">
            {users.filter((u) => u.role === "guest").length}명
          </p>
        </div>
      </div>

      {/* Users table */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">사용자 이름</th>
                <th className="px-6 py-4">이메일 계정</th>
                <th className="px-6 py-4">현재 역할 등급</th>
                <th className="px-6 py-4">가입 시각</th>
                <th className="px-6 py-4 text-right">역할 즉각 부여 및 변경</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm font-semibold text-gray-700">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">
                    가입한 회원 프로필이 아직 없습니다.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.email} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-periwinkle-50 border border-periwinkle-100 text-periwinkle-600 text-xs font-bold shrink-0">
                          {user.display_name ? user.display_name[0].toUpperCase() : "U"}
                        </span>
                        <span className="font-extrabold text-gray-900">
                          {user.display_name ?? "이름 미상"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-400">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getRoleBadge(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {loadingEmail === user.email ? (
                        <span className="text-xs font-bold text-periwinkle-600 animate-pulse">
                          권한 업데이트 중...
                        </span>
                      ) : (
                        <div className="inline-flex rounded-xl bg-gray-100 p-0.5 border border-gray-200">
                          <button
                            onClick={() => handleRoleChange(user.email, "guest")}
                            disabled={user.role === "guest"}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                              user.role === "guest"
                                ? "bg-white text-gray-800 shadow-sm"
                                : "text-gray-400 hover:text-gray-700"
                            }`}
                          >
                            게스트
                          </button>
                          <button
                            onClick={() => handleRoleChange(user.email, "student")}
                            disabled={user.role === "student"}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                              user.role === "student"
                                ? "bg-white text-periwinkle-700 shadow-sm"
                                : "text-gray-400 hover:text-gray-700"
                            }`}
                          >
                            수강생
                          </button>
                          <button
                            onClick={() => handleRoleChange(user.email, "admin")}
                            disabled={user.role === "admin"}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                              user.role === "admin"
                                ? "bg-white text-rose-700 shadow-sm"
                                : "text-gray-400 hover:text-rose-600"
                            }`}
                          >
                            원장
                          </button>
                        </div>
                      )}
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
}
