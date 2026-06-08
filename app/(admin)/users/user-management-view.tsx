"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";
import { EmptyState } from "@/components/ui/empty-state";
import type { UserRole, UserStatus } from "@/lib/auth/session";
import { updateMultipleUsersRoles, updateUserRole } from "./actions";

export type UserManagementItem = {
  userId: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  displayName: string | null;
  realName: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

type PendingChange = {
  userIds: string[];
  labels: string[];
  targetRole: UserRole;
};

const roleLabels: Record<UserRole, string> = {
  admin: "관리자",
  student: "수강생",
  guest: "게스트",
};

const roleButtonClass: Record<UserRole, string> = {
  admin: "text-rose-600 hover:bg-rose-50",
  student: "text-periwinkle-700 hover:bg-periwinkle-50",
  guest: "text-gray-600 hover:bg-gray-50",
};

function getDisplayLabel(user: UserManagementItem) {
  return user.realName ?? user.displayName ?? user.email ?? user.userId;
}

function getRoleBadgeClass(role: UserRole) {
  if (role === "admin") return "border-rose-200 bg-rose-50 text-rose-700";
  if (role === "student") return "border-periwinkle-200 bg-periwinkle-50 text-periwinkle-700";
  return "border-gray-200 bg-gray-50 text-gray-600";
}

export function UserManagementView({ initialUsers }: { initialUsers: UserManagementItem[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loadingTarget, setLoadingTarget] = useState<string | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedUsers = users.filter((user) => selectedUserIds.includes(user.userId));

  const toggleUser = (userId: string) => {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  };

  const toggleAll = () => {
    setSelectedUserIds((current) =>
      current.length === users.length ? [] : users.map((user) => user.userId)
    );
  };

  const requestRoleChange = (targetRole: UserRole, targets: UserManagementItem[]) => {
    if (targets.length === 0) return;
    setPendingChange({
      targetRole,
      userIds: targets.map((target) => target.userId),
      labels: targets.map(getDisplayLabel),
    });
  };

  const confirmRoleChange = async () => {
    if (!pendingChange) return;

    const { userIds, targetRole } = pendingChange;
    setPendingChange(null);
    setMessage(null);
    setLoadingTarget(userIds.length === 1 ? userIds[0] : "bulk");

    const result =
      userIds.length === 1
        ? await updateUserRole(userIds[0], targetRole)
        : await updateMultipleUsersRoles(userIds, targetRole);

    if (result.success) {
      setUsers((current) =>
        current.map((user) => (userIds.includes(user.userId) ? { ...user, role: targetRole } : user))
      );
      setSelectedUserIds((current) => current.filter((id) => !userIds.includes(id)));
      setMessage({ type: "success", text: "권한을 변경했습니다." });
    } else {
      setMessage({ type: "error", text: result.error ?? "권한 변경에 실패했습니다." });
    }

    setLoadingTarget(null);
  };

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`flex items-center gap-2 rounded-2xl border p-4 text-sm font-semibold ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <HugeiconsIcon
            icon={message.type === "success" ? CheckmarkCircle01Icon : Cancel01Icon}
            size={18}
            color="currentColor"
          />
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400">전체 사용자</p>
          <p className="mt-1 text-2xl font-extrabold text-gray-900">{users.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400">수강생</p>
          <p className="mt-1 text-2xl font-extrabold text-periwinkle-700">
            {users.filter((user) => user.role === "student").length}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400">게스트</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-600">
            {users.filter((user) => user.role === "guest").length}
          </p>
        </div>
      </div>

      {selectedUserIds.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-periwinkle-100 bg-periwinkle-50 p-4 text-sm font-semibold text-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <span>{selectedUserIds.length}명 선택됨</span>
          <div className="flex flex-wrap gap-2">
            {(["guest", "student", "admin"] as UserRole[]).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => requestRoleChange(role, selectedUsers)}
                disabled={loadingTarget !== null}
                className={`rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50 ${roleButtonClass[role]}`}
              >
                {roleLabels[role]}로 변경
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        {users.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon="👤"
              title="사용자가 없습니다"
              description="로그인 또는 개발용 persona 생성 후 이곳에 표시됩니다."
              className="border-none bg-transparent shadow-none"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500">
                  <th className="w-12 px-5 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.length === users.length}
                      onChange={toggleAll}
                      aria-label="전체 사용자 선택"
                      className="h-4 w-4 accent-periwinkle-600"
                    />
                  </th>
                  <th className="px-5 py-4">사용자</th>
                  <th className="px-5 py-4">연락처 이메일</th>
                  <th className="px-5 py-4">상태</th>
                  <th className="px-5 py-4">권한</th>
                  <th className="px-5 py-4 text-right">변경</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {users.map((user) => {
                  const label = getDisplayLabel(user);
                  return (
                    <tr key={user.userId} className="hover:bg-gray-50/70">
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.userId)}
                          onChange={() => toggleUser(user.userId)}
                          aria-label={`${label} 선택`}
                          className="h-4 w-4 accent-periwinkle-600"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-periwinkle-100 text-xs font-extrabold text-periwinkle-700">
                            {(label[0] ?? "U").toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-extrabold text-gray-900">{label}</p>
                            <p className="truncate text-xs font-medium text-gray-400">{user.userId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-gray-500">
                        {user.email ?? "미등록"}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-bold text-gray-600">
                          {user.status === "active" ? "활성" : "정지"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getRoleBadgeClass(user.role)}`}
                        >
                          {roleLabels[user.role]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex rounded-full border border-gray-200 bg-white p-1">
                          {(["guest", "student", "admin"] as UserRole[]).map((role) => (
                            <button
                              key={role}
                              type="button"
                              onClick={() => requestRoleChange(role, [user])}
                              disabled={user.role === role || loadingTarget !== null}
                              className={`rounded-full px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 ${roleButtonClass[role]}`}
                            >
                              {roleLabels[role]}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pendingChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <h3 className="text-lg font-extrabold text-gray-900">권한을 변경할까요?</h3>
            <p className="mt-3 text-sm font-medium leading-snug text-gray-500">
              {pendingChange.labels.join(", ")} 사용자를 {roleLabels[pendingChange.targetRole]} 권한으로
              변경합니다.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingChange(null)}
                className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmRoleChange}
                className="flex-1 rounded-full bg-periwinkle-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-periwinkle-700"
              >
                변경
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
