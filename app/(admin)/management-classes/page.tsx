/**
 * 관리반 예약 관리자 화면의 서버 컴포넌트 진입점입니다.
 * 관리자 권한을 먼저 확인한 뒤 운영 데이터와 관리 뷰를 렌더링합니다.
 */

import { Header } from "@/components/admin/layout/header";
import { requireAdmin } from "@/lib/auth/session";
import { getAdminManagementClassOpsData } from "@/lib/management-classes/data";
import { ManagementClassesAdminView } from "./management-classes-admin-view";

export default async function ManagementClassesPage() {
  await requireAdmin();
  const data = await getAdminManagementClassOpsData();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title="관리반 예약"
        description="관리반 공지, 수강생 쿠폰, 선착순 신청 현황을 관리합니다."
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <ManagementClassesAdminView data={data} />
      </div>
    </div>
  );
}
