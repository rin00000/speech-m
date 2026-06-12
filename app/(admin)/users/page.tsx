import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { LockIcon } from "@hugeicons/core-free-icons";
import { Header } from "@/components/admin/layout/header";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/server";
import { UserManagementView, type UserManagementItem } from "./user-management-view";

export default async function UserManagementPage() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Header title="회원 권한 관리" description="관리자만 접근할 수 있는 권한 관리 영역입니다." />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-gray-50/50 p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <span className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <HugeiconsIcon icon={LockIcon} size={26} color="currentColor" strokeWidth={1.8} />
            </span>
            <h2 className="text-xl font-extrabold text-gray-900">접근 권한이 없습니다</h2>
            <p className="mt-3 text-sm font-medium leading-snug text-gray-500">
              회원 권한 변경은 관리자 계정으로만 이용할 수 있습니다.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-periwinkle-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-periwinkle-700"
            >
              대시보드로 이동
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const supabase = createAdminClient();
  const [{ data: userRows, error: usersError }, { data: profileRows, error: profilesError }] =
    await Promise.all([
      supabase.from("users").select("id, role, status, created_at").order("created_at", {
        ascending: false,
      }),
      supabase
        .from("user_profiles")
        .select("user_id, email, display_name, real_name, avatar_url, created_at"),
    ]);

  const profilesByUserId = new Map((profileRows ?? []).map((profile) => [profile.user_id, profile]));
  const users: UserManagementItem[] = (userRows ?? []).map((row) => {
    const profile = profilesByUserId.get(row.id);
    return {
      userId: row.id,
      email: profile?.email ?? null,
      role: row.role,
      status: row.status,
      displayName: profile?.display_name ?? null,
      realName: profile?.real_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      createdAt: row.created_at,
    };
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title="회원 권한 관리"
        description="내부 UUID 기준으로 사용자의 관리자, 수강생, 게스트 권한을 관리합니다."
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-6 md:pb-6">
        {usersError || profilesError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
            사용자 데이터를 불러오지 못했습니다.
          </div>
        ) : (
          <UserManagementView initialUsers={users} />
        )}
      </div>
    </div>
  );
}
