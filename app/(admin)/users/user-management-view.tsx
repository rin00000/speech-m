"use client";

/**
 * @file user-management-view.tsx
 * @description 회원 권한 관리(/users) 화면의 클라이언트 뷰 컴포넌트입니다.
 * 회원 목록 조회, 개별 권한 승인/강등 기능, 다중 선택 및 일괄 권한 변경 툴바,
 * 그리고 조작 실수를 방지하기 위한 변경 확인 컨펌 모달을 제공합니다.
 */

import { useState } from "react";
import { updateUserRole, updateMultipleUsersRoles } from "./actions";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { EmptyState } from "@/components/ui/empty-state";

interface ProfileItem {
  email: string;
  role: "admin" | "student" | "guest";
  display_name: string | null;
  created_at: string;
}

interface PendingChange {
  emails: string[];
  displayNames: string[];
  targetRole: "admin" | "student" | "guest";
}

export function UserManagementView({ initialUsers }: { initialUsers: ProfileItem[] }) {
  const [users, setUsers] = useState<ProfileItem[]>(initialUsers);
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 다중 선택 상태 (선택된 회원들의 이메일 배열)
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  // 권한 변경 컨펌 대기 상태
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);

  // 개별 체크박스 토글
  const handleSelectToggle = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  // 전체 체크박스 토글
  const handleSelectAllToggle = () => {
    if (selectedEmails.length === users.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(users.map((u) => u.email));
    }
  };

  // 단일 권한 변경 요청 (컨펌 모달 오픈)
  const requestSingleRoleChange = (
    email: string,
    displayName: string | null,
    targetRole: "admin" | "student" | "guest"
  ) => {
    setPendingChange({
      emails: [email],
      displayNames: [displayName ?? "이름 미상"],
      targetRole,
    });
  };

  // 일괄 권한 변경 요청 (컨펌 모달 오픈)
  const requestBulkRoleChange = (targetRole: "admin" | "student" | "guest") => {
    if (selectedEmails.length === 0) return;
    const selectedUsers = users.filter((u) => selectedEmails.includes(u.email));
    setPendingChange({
      emails: selectedEmails,
      displayNames: selectedUsers.map((u) => u.display_name ?? "이름 미상"),
      targetRole,
    });
  };

  // 승인 완료 후 실제 권한 변경 실행
  const confirmRoleChange = async () => {
    if (!pendingChange) return;
    const { emails, displayNames, targetRole } = pendingChange;
    setPendingChange(null);

    setErrorMsg(null);
    setSuccessMsg(null);

    // 단일 변경 처리
    if (emails.length === 1) {
      const email = emails[0];
      const displayName = displayNames[0];
      setLoadingEmail(email);

      const result = await updateUserRole(email, targetRole);

      if (result.success) {
        setUsers((prev) =>
          prev.map((u) => (u.email === email ? { ...u, role: targetRole } : u))
        );
        // 완료 시 혹시라도 선택되어 있었다면 선택 해제
        setSelectedEmails((prev) => prev.filter((e) => e !== email));
        setSuccessMsg(
          `[${displayName}] 회원의 권한이 [${getRoleLabel(targetRole)}]으로 변경되었습니다.`
        );
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(result.error ?? "권한 변경 도중 문제가 발생했습니다.");
      }
      setLoadingEmail(null);
    } 
    // 다중 일괄 변경 처리
    else {
      setLoadingEmail("bulk");

      const result = await updateMultipleUsersRoles(emails, targetRole);

      if (result.success) {
        setUsers((prev) =>
          prev.map((u) => (emails.includes(u.email) ? { ...u, role: targetRole } : u))
        );
        setSuccessMsg(
          `선택한 ${emails.length}명 회원의 권한이 [${getRoleLabel(targetRole)}]으로 일괄 변경되었습니다.`
        );
        setSelectedEmails([]); // 선택 상태 초기화
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        setErrorMsg(result.error ?? "일괄 권한 변경 도중 문제가 발생했습니다.");
      }
      setLoadingEmail(null);
    }
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
    <div className="space-y-4 md:space-y-6">
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
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

      {/* Bulk Action Toolbar */}
      {selectedEmails.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 rounded-2xl border border-periwinkle-100 bg-periwinkle-50/70 text-sm font-semibold text-gray-800 animate-fadeIn shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-periwinkle-200 text-periwinkle-700 text-xs font-bold">
              {selectedEmails.length}
            </span>
            <span className="text-gray-700">명의 회원이 선택되었습니다.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 mr-1 hidden md:inline">일괄 변경 권한:</span>
            <div className="inline-flex rounded-xl bg-white p-0.5 border border-gray-200 shadow-xs">
              <button
                onClick={() => requestBulkRoleChange("guest")}
                disabled={loadingEmail !== null}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-50"
              >
                게스트
              </button>
              <button
                onClick={() => requestBulkRoleChange("student")}
                disabled={loadingEmail !== null}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-periwinkle-600 hover:text-periwinkle-700 hover:bg-periwinkle-50 transition-all cursor-pointer disabled:opacity-50"
              >
                수강생
              </button>
              <button
                onClick={() => requestBulkRoleChange("admin")}
                disabled={loadingEmail !== null}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-all cursor-pointer disabled:opacity-50"
              >
                원장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users list/table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:rounded-3xl">
        {/* Mobile View */}
        <div className="divide-y divide-gray-100 md:hidden">
          {users.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon="👥"
                title="가입한 회원 프로필이 아직 없습니다"
                description="새로운 회원이 가입하면 이곳에 표시됩니다."
                className="border-none bg-transparent shadow-none"
              />
            </div>
          ) : (
            users.map((user) => (
              <article
                key={user.email}
                className={`space-y-4 p-4 transition-colors ${
                  selectedEmails.includes(user.email) ? "bg-periwinkle-50/10" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-2">
                    <input
                      type="checkbox"
                      checked={selectedEmails.includes(user.email)}
                      onChange={() => handleSelectToggle(user.email)}
                      disabled={loadingEmail !== null}
                      aria-label={`${user.display_name ?? "이름 미상"} (${user.email}) 선택`}
                      className="h-4.5 w-4.5 rounded border border-gray-300 bg-white text-periwinkle-600 focus:ring-periwinkle-500 focus:ring-offset-0 transition-colors cursor-pointer checked:bg-periwinkle-600 checked:border-transparent accent-periwinkle-600 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-periwinkle-100 bg-periwinkle-50 text-sm font-bold text-periwinkle-600">
                    {user.display_name ? user.display_name[0].toUpperCase() : "U"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-extrabold leading-snug text-gray-900">
                      {user.display_name ?? "이름 미상"}
                    </h3>
                    <p className="mt-1 break-all text-xs font-medium leading-snug text-gray-400">
                      {user.email}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getRoleBadge(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </div>
                  </div>
                </div>

                {loadingEmail === user.email ? (
                  <div className="rounded-2xl bg-periwinkle-50 px-3 py-2 text-center text-xs font-bold text-periwinkle-600">
                    권한 업데이트 중...
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1 rounded-2xl border border-gray-200 bg-gray-100 p-1">
                    <button
                      onClick={() => requestSingleRoleChange(user.email, user.display_name, "guest")}
                      disabled={user.role === "guest" || loadingEmail !== null}
                      className={`rounded-xl px-2 py-2 text-xs font-bold transition-all ${
                        user.role === "guest"
                          ? "bg-white text-gray-800 shadow-sm"
                          : "text-gray-400 hover:text-gray-700 cursor-pointer disabled:opacity-50"
                      }`}
                    >
                      게스트
                    </button>
                    <button
                      onClick={() => requestSingleRoleChange(user.email, user.display_name, "student")}
                      disabled={user.role === "student" || loadingEmail !== null}
                      className={`rounded-xl px-2 py-2 text-xs font-bold transition-all ${
                        user.role === "student"
                          ? "bg-white text-periwinkle-700 shadow-sm"
                          : "text-gray-400 hover:text-gray-700 cursor-pointer disabled:opacity-50"
                      }`}
                    >
                      수강생
                    </button>
                    <button
                      onClick={() => requestSingleRoleChange(user.email, user.display_name, "admin")}
                      disabled={user.role === "admin" || loadingEmail !== null}
                      className={`rounded-xl px-2 py-2 text-xs font-bold transition-all ${
                        user.role === "admin"
                          ? "bg-white text-rose-700 shadow-sm"
                          : "text-gray-400 hover:text-rose-600 cursor-pointer disabled:opacity-50"
                      }`}
                    >
                      원장
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && selectedEmails.length === users.length}
                    onChange={handleSelectAllToggle}
                    disabled={loadingEmail !== null}
                    aria-label={
                      users.length > 0 && selectedEmails.length === users.length
                        ? "전체 회원 선택 해제"
                        : "전체 회원 선택"
                    }
                    className="h-4.5 w-4.5 rounded border border-gray-300 bg-white text-periwinkle-600 focus:ring-periwinkle-500 focus:ring-offset-0 transition-colors cursor-pointer checked:bg-periwinkle-600 checked:border-transparent accent-periwinkle-600 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </th>
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
                  <td colSpan={6} className="px-6 py-12">
                    <EmptyState
                      icon="👥"
                      title="가입한 회원 프로필이 아직 없습니다"
                      description="새로운 회원이 가입하면 이곳에 표시됩니다."
                      className="border-none bg-transparent shadow-none"
                    />
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.email}
                    className={`hover:bg-gray-50/30 transition-colors ${
                      selectedEmails.includes(user.email) ? "bg-periwinkle-50/10" : ""
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={selectedEmails.includes(user.email)}
                        onChange={() => handleSelectToggle(user.email)}
                        disabled={loadingEmail !== null}
                        aria-label={`${user.display_name ?? "이름 미상"} (${user.email}) 선택`}
                        className="h-4.5 w-4.5 rounded border border-gray-300 bg-white text-periwinkle-600 focus:ring-periwinkle-500 focus:ring-offset-0 transition-colors cursor-pointer checked:bg-periwinkle-600 checked:border-transparent accent-periwinkle-600 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </td>
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
                            onClick={() => requestSingleRoleChange(user.email, user.display_name, "guest")}
                            disabled={user.role === "guest" || loadingEmail !== null}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                              user.role === "guest"
                                ? "bg-white text-gray-800 shadow-sm"
                                : "text-gray-400 hover:text-gray-700 cursor-pointer disabled:opacity-50"
                            }`}
                          >
                            게스트
                          </button>
                          <button
                            onClick={() => requestSingleRoleChange(user.email, user.display_name, "student")}
                            disabled={user.role === "student" || loadingEmail !== null}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                              user.role === "student"
                                ? "bg-white text-periwinkle-700 shadow-sm"
                                : "text-gray-400 hover:text-gray-700 cursor-pointer disabled:opacity-50"
                            }`}
                          >
                            수강생
                          </button>
                          <button
                            onClick={() => requestSingleRoleChange(user.email, user.display_name, "admin")}
                            disabled={user.role === "admin" || loadingEmail !== null}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                              user.role === "admin"
                                ? "bg-white text-rose-700 shadow-sm"
                                : "text-gray-400 hover:text-rose-600 cursor-pointer disabled:opacity-50"
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

      {/* Confirmation Dialog Modal */}
      {pendingChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="relative w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-6 shadow-island text-center animate-scaleUp">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-periwinkle-50 text-periwinkle-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">
              권한 변경 승인 확인
            </h3>

            <div className="mt-3 text-sm font-medium text-gray-500 leading-relaxed text-left bg-gray-50 p-3.5 rounded-2xl border border-gray-100 max-h-36 overflow-y-auto">
              {pendingChange.emails.length === 1 ? (
                <>
                  대상: <strong className="text-gray-800">{pendingChange.displayNames[0]} ({pendingChange.emails[0]})</strong>
                  <br />
                  선택한 회원의 권한을 <strong className="text-periwinkle-600">[{getRoleLabel(pendingChange.targetRole)}]</strong>(으)로 변경하시겠습니까?
                </>
              ) : (
                <>
                  선택한 <strong className="text-periwinkle-600">{pendingChange.emails.length}명</strong>의 회원 권한을 일괄적으로 <strong className="text-periwinkle-600">[{getRoleLabel(pendingChange.targetRole)}]</strong>(으)로 변경하시겠습니까?
                  <span className="block mt-2 pt-2 border-t border-gray-200 text-xs text-gray-400">
                    대상자: {pendingChange.displayNames.join(", ")}
                  </span>
                </>
              )}
            </div>

            <p className="mt-2.5 text-xs font-semibold text-amber-600">
              ⚠️ 권한 승인 시, 해당 회원의 서비스 접근 범위가 즉시 변경됩니다.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setPendingChange(null)}
                className="flex-1 py-2.5 rounded-full border border-gray-200 bg-white text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={confirmRoleChange}
                className="flex-1 py-2.5 rounded-full bg-periwinkle-600 text-sm font-bold text-white hover:bg-periwinkle-700 transition-all cursor-pointer"
              >
                승인 및 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
