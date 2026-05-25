/**
 * 로그인 페이지 로딩 스켈레톤.
 * 카드 레이아웃의 로그인 폼 뼈대 UI.
 */

import { Skeleton, SkeletonLine } from "@/components/ui/skeleton";

export default function LoginLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <section className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* 제목 */}
        <SkeletonLine size="md" width="1/4" />
        <div className="mt-1">
          <SkeletonLine size="xs" width="1/2" />
        </div>

        {/* 버튼 2개 */}
        <div className="mt-6 flex flex-col gap-3">
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
      </section>
    </main>
  );
}
