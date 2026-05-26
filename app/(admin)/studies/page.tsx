import { Header } from "@/components/admin/layout/header";
import { HugeiconsIcon } from "@hugeicons/react";
import { BookOpen01Icon } from "@hugeicons/core-free-icons";

export default function StudiesPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title="스터디 관리"
        description="수강생 스터디 그룹을 개설하고 관리합니다."
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <p className="mb-5 text-sm leading-tight text-gray-500">
          스터디 그룹 현황과 참여 수강생을 확인하세요.
        </p>

        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center shadow-sm md:rounded-3xl md:py-20">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-gray-400">
            <HugeiconsIcon
              icon={BookOpen01Icon}
              size={28}
              color="currentColor"
              strokeWidth={1.5}
            />
          </span>
          <p className="mt-4 text-sm font-medium leading-tight text-gray-600">
            운영 중인 스터디가 없습니다
          </p>
          <p className="mt-1 text-xs leading-tight text-gray-400">
            새 스터디를 개설하면 여기에 표시됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
