import { Header } from "@/components/admin/layout/header";
import { EmptyState } from "@/components/ui/empty-state";
import { TransitionLink } from "@/components/ui/transition-link";

export default function ReviewsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <Header
        title="시험 후기"
        description="시험 경험 및 면접 질문 보관함 (보안 구역)"
      />

      <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto p-4 md:p-6">
        <EmptyState
          icon="🚧"
          title="시험 후기를 준비하고 있어요"
          description={
            <>
              합격 후기와 시험별 진행 정보를 모아볼 수 있는 기능입니다.<br />
              현재는 이용할 수 없으며, 추후 업데이트될 예정입니다.
            </>
          }
          action={
            <TransitionLink
              href="/dashboard"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-periwinkle-200 bg-periwinkle-100 px-5 py-2.5 text-sm font-semibold leading-none text-periwinkle-700 transition-colors hover:bg-periwinkle-200"
            >
              대시보드로 돌아가기
            </TransitionLink>
          }
          className="my-auto max-w-md bg-white border-gray-100 shadow-sm"
        />
      </div>
    </div>
  );
}
