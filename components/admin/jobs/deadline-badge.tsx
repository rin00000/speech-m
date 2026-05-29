/**
 * 공고 마감일을 날짜/텍스트 마감 규칙에 맞춰 작은 배지로 표시한다.
 * 테이블과 모바일 카드에서 같은 마감 표현을 재사용한다.
 */

import { TEXT_DEADLINE } from "@/lib/crawl/shared";

export const DeadlineBadge = ({ deadline }: { deadline: string | null }) => {
  if (!deadline) return <span className="text-gray-400">—</span>;

  if (TEXT_DEADLINE.has(deadline)) {
    return <span className="text-gray-500">{deadline}</span>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(
    (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium leading-none text-gray-500 ring-1 ring-gray-200">
          마감
        </span>
        <span className="text-xs text-gray-400">{deadline}</span>
      </span>
    );
  }
  if (diffDays === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-xs font-medium leading-none text-red-600 ring-1 ring-red-200">
        D-day
      </span>
    );
  }
  if (diffDays <= 3) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-xs font-medium leading-none text-amber-600 ring-1 ring-amber-200">
        D-{diffDays}
      </span>
    );
  }
  return <span className="text-xs text-gray-500">{deadline}</span>;
};
