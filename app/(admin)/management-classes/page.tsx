import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { LockIcon } from "@hugeicons/core-free-icons";
import { Header } from "@/components/admin/layout/header";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminManagementClassOpsData } from "@/lib/management-classes/data";
import { ManagementClassesAdminView } from "./management-classes-admin-view";

export default async function ManagementClassesPage() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  const data = isAdmin ? await getAdminManagementClassOpsData() : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title="관리반 예약"
        description="관리반 공지, 수강생 쿠폰, 선착순 신청 현황을 관리합니다."
      />

      {isAdmin && data ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          <ManagementClassesAdminView data={data} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-gray-50/50 p-4 md:p-6">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm md:rounded-3xl md:p-8">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <HugeiconsIcon icon={LockIcon} size={28} color="currentColor" />
            </span>
            <h2 className="mt-5 text-xl font-extrabold tracking-tight text-gray-900">
              관리자 전용 화면입니다
            </h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-gray-500">
              관리반 쿠폰과 신청 현황은 관리자 계정으로만 운영할 수 있습니다.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-periwinkle-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-periwinkle-700"
            >
              대시보드로 돌아가기
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
