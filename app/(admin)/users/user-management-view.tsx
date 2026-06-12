"use client";

/**
 * 사용자 역할과 상태를 관리하는 클라이언트 뷰입니다.
 * 검색 결과 기준 다중 선택과 updateUserRole/updateMultipleUsersRoles 호출 흐름을 담당합니다.
 */

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, CheckmarkCircle01Icon, Search01Icon } from "@hugeicons/core-free-icons";
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
  requiresAdminConfirm: boolean;
};

const roleLabels: Record<UserRole, string> = {
  admin: "관리자",
  student: "수강생",
  guest: "게스트",
};

const statusLabels: Record<UserStatus, string> = {
  active: "활성",
  suspended: "정지",
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
  if (role === "admin") return "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100";
  if (role === "student") return "border-periwinkle-200 bg-periwinkle-50 text-periwinkle-700 hover:bg-periwinkle-100";
  return "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100";
}

function getUserSearchText(user: UserManagementItem) {
  return [
    user.userId,
    user.email,
    user.displayName,
    user.realName,
    user.role,
    roleLabels[user.role],
    user.status,
    statusLabels[user.status],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getPendingLabelPreview(labels: string[]) {
  const preview = labels.slice(0, 3).join(", ");
  if (labels.length <= 3) return preview;
  return `${preview} 외 ${labels.length - 3}명`;
}

export function UserManagementView({ initialUsers }: { initialUsers: UserManagementItem[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loadingTarget, setLoadingTarget] = useState<string | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [adminConfirmText, setAdminConfirmText] = useState("");

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    if (!normalizedSearchQuery) return users;
    return users.filter((user) => getUserSearchText(user).includes(normalizedSearchQuery));
  }, [normalizedSearchQuery, users]);

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedUserIds.includes(user.userId)),
    [selectedUserIds, users]
  );
  const selectedFilteredUserIds = useMemo(
    () => filteredUsers.filter((user) => selectedUserIds.includes(user.userId)).map((user) => user.userId),
    [filteredUsers, selectedUserIds]
  );
  const allFilteredSelected =
    filteredUsers.length > 0 && selectedFilteredUserIds.length === filteredUsers.length;

  const toggleUser = (userId: string) => {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  };

  const toggleFilteredUsers = () => {
    const filteredUserIds = filteredUsers.map((user) => user.userId);
    const filteredUserIdSet = new Set(filteredUserIds);

    setSelectedUserIds((current) => {
      const shouldClearFiltered = filteredUserIds.every((userId) => current.includes(userId));
      if (shouldClearFiltered) {
        return current.filter((userId) => !filteredUserIdSet.has(userId));
      }
      return Array.from(new Set([...current, ...filteredUserIds]));
    });
  };

  const requestRoleChange = (targetRole: UserRole, targets: UserManagementItem[]) => {
    if (targets.length === 0) return;
    setPendingChange({
      targetRole,
      userIds: targets.map((target) => target.userId),
      labels: targets.map(getDisplayLabel),
      requiresAdminConfirm: targets.some((t) => t.role === "admin" && targetRole !== "admin"),
    });
    setAdminConfirmText("");
  };

  const confirmRoleChange = async () => {
    if (!pendingChange) return;
    if (pendingChange.requiresAdminConfirm && adminConfirmText !== "관리자 해제") return;

    const { userIds, targetRole } = pendingChange;
    setPendingChange(null);
    setMessage(null);
    setLoadingTarget(userIds.length === 1 ? userIds[0] : "bulk");

    try {
      const result =
        userIds.length === 1
          ? await updateUserRole(userIds[0], targetRole)
          : await updateMultipleUsersRoles(userIds, targetRole);

      if (result.success) {
        setUsers((current) =>
          current.map((user) =>
            userIds.includes(user.userId) ? { ...user, role: targetRole } : user
          )
        );
        setSelectedUserIds((current) => current.filter((id) => !userIds.includes(id)));
        setMessage({ type: "success", text: "권한을 변경했습니다." });
      } else {
        setMessage({ type: "error", text: result.error ?? "권한 변경에 실패했습니다." });
      }
    } catch (error) {
      console.error("confirmRoleChange unexpected error:", error);
      setMessage({ type: "error", text: "서버 오류가 발생했습니다." });
    } finally {
      setLoadingTarget(null);
    }
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

      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block text-xs font-extrabold text-gray-600">회원 검색</span>
            <span className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 focus-within:border-periwinkle-300">
              <HugeiconsIcon icon={Search01Icon} size={16} color="currentColor" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="이름, 이메일, UUID, 권한으로 검색"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-gray-800 outline-none placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                  aria-label="검색어 지우기"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={14} color="currentColor" />
                </button>
              )}
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-gray-500">
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-2">
              검색 결과 {filteredUsers.length}명
            </span>
            {selectedFilteredUserIds.length > 0 && (
              <span className="rounded-full border border-periwinkle-200 bg-periwinkle-50 px-3 py-2 text-periwinkle-700">
                결과 중 {selectedFilteredUserIds.length}명 선택
              </span>
            )}
            <button
              type="button"
              onClick={toggleFilteredUsers}
              disabled={filteredUsers.length === 0 || loadingTarget !== null}
              className="rounded-full border border-gray-200 bg-white px-3 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {allFilteredSelected ? "검색 결과 선택 해제" : "검색 결과 전체 선택"}
            </button>
          </div>
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
              description="로그인 또는 개발용 persona 생성 후 목록에 표시됩니다."
              className="border-none bg-transparent shadow-none"
            />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon="SM"
              title="검색 결과가 없습니다"
              description="이름, 이메일, UUID, 권한 키워드로 다시 검색해 주세요."
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
                      checked={allFilteredSelected}
                      onChange={toggleFilteredUsers}
                      aria-label={normalizedSearchQuery ? "검색 결과 사용자 선택" : "전체 사용자 선택"}
                      className="h-4 w-4 accent-periwinkle-600"
                    />
                  </th>
                  <th className="px-5 py-4">사용자</th>
                  <th className="px-5 py-4">연락처 이메일</th>
                  <th className="px-5 py-4">상태</th>
                  <th className="px-5 py-4">권한</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredUsers.map((user) => {
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
                            <p className="truncate text-xs font-medium text-gray-400">
                              {user.userId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-gray-500">
                        {user.email ?? "미등록"}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-bold text-gray-600">
                          {statusLabels[user.status]}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() => setOpenDropdownId(openDropdownId === user.userId ? null : user.userId)}
                            className={`rounded-full border px-2.5 py-1 text-xs font-bold cursor-pointer transition-colors ${getRoleBadgeClass(user.role)}`}
                          >
                            {roleLabels[user.role]}
                          </button>
                          {openDropdownId === user.userId && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setOpenDropdownId(null)}
                                aria-hidden="true"
                              />
                              <div className="absolute left-0 top-full z-20 mt-1 flex w-max flex-col gap-1 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg animate-in fade-in zoom-in-95 duration-150">
                                {(["guest", "student", "admin"] as UserRole[])
                                  .filter((role) => role !== user.role)
                                  .map((role) => (
                                    <button
                                      key={role}
                                      type="button"
                                      onClick={() => {
                                        setOpenDropdownId(null);
                                        requestRoleChange(role, [user]);
                                      }}
                                      disabled={loadingTarget !== null}
                                      className={`rounded-xl px-4 py-2 text-left text-xs font-bold hover:bg-gray-50 ${roleButtonClass[role]}`}
                                    >
                                      {roleLabels[role]}로 변경
                                    </button>
                                  ))}
                              </div>
                            </>
                          )}
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
            <h3 className="text-lg font-extrabold text-gray-900">
              {pendingChange.requiresAdminConfirm ? "관리자 권한 해제" : "권한을 변경할까요?"}
            </h3>
            <p className="mt-3 text-sm font-medium leading-snug text-gray-500">
              {getPendingLabelPreview(pendingChange.labels)} 사용자를{" "}
              {roleLabels[pendingChange.targetRole]} 권한으로 변경합니다.
            </p>

            {pendingChange.requiresAdminConfirm && (
              <div className="mt-4 text-left rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <p className="mb-2 text-xs font-bold text-rose-700">
                  ⚠️ 관리자 권한을 해제하는 작업입니다. 안전을 위해 아래에 <span className="font-black select-all text-rose-900">관리자 해제</span>를 입력해 주세요.
                </p>
                <input 
                  type="text" 
                  value={adminConfirmText}
                  onChange={(e) => setAdminConfirmText(e.target.value)}
                  className="w-full rounded-xl border border-rose-200 px-3 py-2 text-sm font-bold text-rose-900 outline-none focus:border-rose-400 focus:bg-white"
                  placeholder="관리자 해제"
                />
              </div>
            )}

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
                disabled={pendingChange.requiresAdminConfirm && adminConfirmText !== "관리자 해제"}
                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  pendingChange.requiresAdminConfirm ? "bg-rose-600 hover:bg-rose-700" : "bg-periwinkle-600 hover:bg-periwinkle-700"
                }`}
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
