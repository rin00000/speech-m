import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { Header } from "@/components/admin/layout/header";
import { UserManagementView } from "./user-management-view";
import { HugeiconsIcon } from "@hugeicons/react";
import { LockIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";

interface ProfileItem {
  email: string;
  role: "admin" | "student" | "guest";
  display_name: string | null;
  created_at: string;
}

export default async function UserManagementPage() {
  const user = await getCurrentUser();
  const isAdmin = user && user.role === "admin";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title="회원 권한 콘솔"
        description="가입 회원들의 역할을 관리하고 수강생 정회원 권한을 승인 및 강등할 수 있는 총괄 권한실입니다."
      />

      {isAdmin ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {/* Fetch data */}
          {(() => {
            return (
              async () => {
                const supabase = createAdminClient();
                const { data, error } = await supabase
                  .from("user_profiles")
                  .select("email, role, display_name, created_at")
                  .order("created_at", { ascending: false });

                if (error) {
                  return (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
                      가입자 데이터를 조회하는 동안 데이터베이스 오류가 발생했습니다.
                    </div>
                  );
                }

                const usersList = (data ?? []) as ProfileItem[];
                return <UserManagementView initialUsers={usersList} />;
              }
            )();
          })()}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-gradient-to-br from-slate-50 to-rose-50/10 p-6">
          <div className="max-w-md w-full rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-lg relative overflow-hidden">
            <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-rose-100/50 blur-2xl" />
            
            <span className="relative z-10 inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-6 shadow-sm">
              <HugeiconsIcon icon={LockIcon} size={28} color="currentColor" strokeWidth={1.8} />
            </span>

            <h2 className="relative z-10 text-xl font-extrabold text-gray-900 tracking-tight">
              접근 권한이 차단되었습니다
            </h2>
            <p className="mt-3 text-sm font-medium text-gray-500 leading-relaxed">
              본 화면은 아카데미를 총괄하는 **&apos;원장 / 관리자(admin)&apos;** 계정으로 로그인한 경우에만 관리할 수 있는 최고 보안 영역입니다.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/dashboard"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-periwinkle-600 px-4 py-3 text-sm font-extrabold text-white shadow-md transition-all active:scale-[0.98] hover:bg-periwinkle-700"
              >
                나의 대시보드로 돌아가기
              </Link>
              <Link
                href="/jobs"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-gray-100 px-4 py-2.5 text-xs font-bold text-gray-600 transition-all hover:bg-gray-200"
              >
                채용 정보 보러가기
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
