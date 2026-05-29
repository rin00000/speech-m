/**
 * 프로토타입 쇼케이스의 공고 검토 큐 데모.
 * 채용 큐 시각 샘플을 독립시켜 실제 조정판 상태와 느슨하게 연결한다.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

type PrototypeJobQueueDemoProps = {
  cardBgClass: string;
  glowClass: string;
};

export function PrototypeJobQueueDemo({
  cardBgClass,
  glowClass,
}: PrototypeJobQueueDemoProps) {
  return (
    <div className={cn("rounded-3xl p-6 transition-all duration-300", cardBgClass, glowClass)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="inline-flex rounded-full border border-periwinkle-200 bg-periwinkle-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-periwinkle-700">
            Module: Scraper AI Filter Queue
          </span>
          <h3 className="mt-1 text-base font-extrabold leading-tight text-gray-900">
            공고 검토 관리자 피드
          </h3>
        </div>
        <Badge tone="neutral" className="text-[10px]">
          Curation Quality Bar: High
        </Badge>
      </div>

      <div className="space-y-1 divide-y divide-gray-100">
        <div className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center">
          <div className="max-w-md space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-extrabold leading-tight text-gray-900">
                KBS 신입 아나운서 공개 채용 (서울 본사)
              </h4>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold leading-none text-emerald-700">
                AI 적합 94%
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-400">
              MediaJob · 마감 D-5 · 서울 여의도 본사 · 프리랜서/정규직
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button size="sm" variant="soft">
              승인
            </Button>
            <Button size="sm" variant="ghost">
              거절
            </Button>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center">
          <div className="max-w-md space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-extrabold leading-tight text-gray-900">
                MBC 기상캐스터 경력 사원 채용
              </h4>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold leading-none text-amber-700">
                검토 보류 68%
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-400">
              아랑 네이버 카페 · 마감 D-12 · 서울 마포구 상암동
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button size="sm" variant="soft">
              승인
            </Button>
            <Button size="sm" variant="ghost">
              거절
            </Button>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 py-3.5 opacity-60 transition-opacity hover:opacity-100 sm:flex-row sm:items-center">
          <div className="max-w-md space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold leading-tight text-gray-600 line-through">
                개인 유튜브 채널 리포터 모집
              </h4>
              <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[10px] font-extrabold leading-none text-red-700">
                자동 제외 (유튜브 전용)
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-400">
              알바몬 크롤러 · 마감 D-2 · 전국 재택근무
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-500">
              자동 제외됨
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
