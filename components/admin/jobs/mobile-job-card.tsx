"use client";

/**
 * 모바일 공고 목록에서 사용하는 카드형 행 컴포넌트.
 * 선택 체크박스, 핵심 메타 정보, AI 사유, 행 액션을 작은 화면에 맞게 묶는다.
 */

import { HugeiconsIcon } from "@hugeicons/react";
import { LinkSquare01Icon } from "@hugeicons/core-free-icons";
import { SOURCE_LABEL, STATUS_STYLE } from "@/lib/jobs/constants";
import { relativeTime } from "@/lib/jobs/utils";
import { AiRejectReasonBlock } from "./ai-reject-reason";
import { DeadlineBadge } from "./deadline-badge";
import { JobRowActions } from "./job-row-actions";
import type { JobPosting } from "./jobs-table-types";

export const MobileJobCard = ({
  job,
  isSelected,
  showAiRejectReasons,
  onToggle,
}: {
  job: JobPosting;
  isSelected: boolean;
  showAiRejectReasons: boolean;
  onToggle: () => void;
}) => {
  const statusStyle = STATUS_STYLE[job.status];

  return (
    <article className={`space-y-3 p-4 transition-colors ${isSelected ? "bg-periwinkle-50" : "bg-white"}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 accent-periwinkle-600"
          aria-label={`${job.title} 선택`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium leading-none text-gray-500">
              {SOURCE_LABEL[job.source]}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-none ring-1 ring-inset ${statusStyle.className}`}
            >
              {statusStyle.label}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-extrabold leading-snug text-gray-900">{job.title}</h3>
          <p className="mt-1 text-xs font-semibold leading-snug text-gray-600">
            {job.company ?? "회사 미상"}
            {job.location ? <span className="font-medium text-gray-400"> · {job.location}</span> : null}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-50/70 p-3 text-xs">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">마감</p>
          <div className="mt-1">
            <DeadlineBadge deadline={job.deadline} />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">수집</p>
          <p className="mt-1 font-medium text-gray-500" title={job.created_at}>
            {relativeTime(job.created_at)}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">이미 게시</p>
          <p className="mt-1 font-medium text-gray-500" title={job.published_at ?? undefined}>
            {job.published_at ? relativeTime(job.published_at) : "미게시"}
          </p>
        </div>
      </div>

      {showAiRejectReasons && (
        <div className="rounded-2xl border border-gray-100 bg-white p-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">AI 사유</p>
          <AiRejectReasonBlock job={job} />
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
        <a
          href={job.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-periwinkle-50 hover:text-periwinkle-700"
          title="원문 보기"
        >
          <HugeiconsIcon icon={LinkSquare01Icon} size={16} color="currentColor" strokeWidth={1.6} />
        </a>
        <JobRowActions
          jobId={job.id}
          jobTitle={job.title}
          company={job.company}
          location={job.location}
          deadline={job.deadline}
          source={job.source}
          sourceUrl={job.source_url}
          status={job.status}
          publishedAt={job.published_at}
        />
      </div>
    </article>
  );
};
