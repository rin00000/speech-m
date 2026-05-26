import { Header } from "@/components/admin/layout/header";
import { HugeiconsIcon } from "@hugeicons/react";
import { FileEditIcon, LockIcon } from "@hugeicons/core-free-icons";

export default function ReviewsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title="시험 후기"
        description="시험 경험 및 면접 질문 보관함 (보안 구역)"
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mb-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5">
            <HugeiconsIcon
              icon={LockIcon}
              size={13}
              color="currentColor"
              strokeWidth={1.5}
            />
            <span className="text-xs font-medium leading-none text-amber-700">
              이 영역은 수강생 전용 비공개 자료입니다
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-dashed border-gray-200 bg-white py-20 text-center shadow-sm">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-gray-400">
            <HugeiconsIcon
              icon={FileEditIcon}
              size={28}
              color="currentColor"
              strokeWidth={1.5}
            />
          </span>
          <p className="mt-4 text-sm font-medium leading-tight text-gray-600">
            등록된 시험 후기가 없습니다
          </p>
          <p className="mt-1 text-xs leading-tight text-gray-400">
            Supabase RLS가 적용된 안전한 공간에 후기를 보관합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
