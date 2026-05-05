import { Header } from "@/components/admin/header";
import { HugeiconsIcon } from "@hugeicons/react";
import { Briefcase01Icon, Add01Icon } from "@hugeicons/core-free-icons";

export default function JobsPage() {
  return (
    <div className="flex flex-col">
      <Header
        title="공고 관리"
        description="미디어잡, 회사 홈페이지 등에서 수집된 공고를 관리합니다."
      />

      <div className="flex-1 p-6">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            수집된 공고를 검토하고 네이버 블로그에 발행하세요.
          </p>
          <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700">
            <HugeiconsIcon
              icon={Add01Icon}
              size={15}
              color="currentColor"
              strokeWidth={2}
            />
            공고 추가
          </button>
        </div>

        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center shadow-sm">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <HugeiconsIcon
              icon={Briefcase01Icon}
              size={28}
              color="currentColor"
              strokeWidth={1.5}
            />
          </span>
          <p className="mt-4 text-sm font-medium text-slate-600">
            등록된 공고가 없습니다
          </p>
          <p className="mt-1 text-xs text-slate-400">
            크롤러를 실행하거나 직접 공고를 추가해 주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
