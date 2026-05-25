/**
 * 사용자 관리 페이지 로딩 스켈레톤.
 * 사용자 목록 테이블 뼈대 UI.
 */

import {
  Skeleton,
  SkeletonLine,
  SkeletonPageHeader,
  SkeletonTable,
} from "@/components/ui/skeleton";

export default function UsersLoading() {
  return (
    <div className="flex flex-col">
      <SkeletonPageHeader />

      <div className="flex-1 p-6">
        <SkeletonTable rows={8} cols={5} />
      </div>
    </div>
  );
}
