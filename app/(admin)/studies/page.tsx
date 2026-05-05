import { Header } from "@/components/admin/header";
import { HugeiconsIcon } from "@hugeicons/react";
import { BookOpen01Icon, Add01Icon } from "@hugeicons/core-free-icons";

export default function StudiesPage() {
  return (
    <div className="flex flex-col">
      <Header
        title="스터디 관리"
        description="수강생 스터디 그룹을 개설하고 관리합니다."
      />

      <div className="flex-1 p-6">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            스터디 그룹 현황과 참여 수강생을 확인하세요.
          </p>
          <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700">
            <HugeiconsIcon
              icon={Add01Icon}
              size={15}
              color="currentColor"
              strokeWidth={2}
            />
            스터디 개설
          </button>
        </div>

        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center shadow-sm">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <HugeiconsIcon
              icon={BookOpen01Icon}
              size={28}
              color="currentColor"
              strokeWidth={1.5}
            />
          </span>
          <p className="mt-4 text-sm font-medium text-slate-600">
            운영 중인 스터디가 없습니다
          </p>
          <p className="mt-1 text-xs text-slate-400">
            새 스터디를 개설하면 여기에 표시됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
