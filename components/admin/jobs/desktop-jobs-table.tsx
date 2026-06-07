"use client";

/**
 * 데스크톱 공고 테이블 본문과 헤더를 담당한다.
 * JobsTable의 상태 계산 결과를 받아 행 렌더링만 수행한다.
 */

import { HugeiconsIcon } from "@hugeicons/react";
import { LinkSquare01Icon } from "@hugeicons/core-free-icons";
import { SOURCE_LABEL, STATUS_STYLE } from "@/lib/jobs/constants";
import { relativeTime } from "@/lib/jobs/utils";
import { AiRejectReasonCell } from "./ai-reject-reason";
import { DeadlineBadge } from "./deadline-badge";
import { JobRowActions } from "./job-row-actions";
import type { JobPosting } from "./jobs-table-types";

export const DesktopJobsTable = ({
  jobs,
  query,
  selectedIds,
  allSelected,
  someSelected,
  showAiRejectReasons,
  cellPaddingClass,
  onToggleAll,
  onToggleOne,
}: {
  jobs: JobPosting[];
  query: string;
  selectedIds: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
  showAiRejectReasons: boolean;
  cellPaddingClass: string;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
}) => {
  const tableColSpan = showAiRejectReasons ? 11 : 10;

  return (
    <div className="hidden overflow-x-auto overscroll-x-contain md:block" tabIndex={0} role="region" aria-label="공고 목록">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 shadow-sm">
            <th className={`w-10 ${cellPaddingClass}`}>
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={onToggleAll}
                className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 accent-periwinkle-600"
              />
            </th>
            <th className={cellPaddingClass}>공고명</th>
            <th className={cellPaddingClass}>회사</th>
            <th className={cellPaddingClass}>소스</th>
            <th className={cellPaddingClass}>마감일</th>
            <th className={cellPaddingClass}>상태</th>
            {showAiRejectReasons && <th className={cellPaddingClass}>AI 사유</th>}
            <th className={cellPaddingClass}>내부 게시 시각</th>
            <th className={cellPaddingClass}>수집일</th>
            <th className={cellPaddingClass}>링크</th>
            <th className={cellPaddingClass}>액션</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {jobs.length === 0 ? (
            <tr>
              <td colSpan={tableColSpan} className="py-12 text-center text-sm text-gray-400">
                &ldquo;{query}&rdquo; 에 해당하는 공고가 없습니다.
              </td>
            </tr>
          ) : (
            jobs.map((job) => {
              const statusStyle = STATUS_STYLE[job.status];
              const isSelected = selectedIds.has(job.id);
              return (
                <tr
                  key={job.id}
                  className={`transition-colors hover:bg-gray-50/60 ${isSelected ? "bg-periwinkle-50" : ""}`}
                >
                  <td className={cellPaddingClass}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleOne(job.id)}
                      className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 accent-periwinkle-600"
                    />
                  </td>
                  <td className={`${cellPaddingClass} font-medium text-gray-800`}>
                    {job.source_url ? (
                      <a
                        href={job.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-periwinkle-600 hover:underline transition-colors cursor-pointer"
                      >
                        {job.title}
                      </a>
                    ) : (
                      job.title
                    )}
                    {job.location && <span className="ml-2 text-xs font-normal text-gray-400">{job.location}</span>}
                  </td>
                  <td className={`${cellPaddingClass} text-gray-600`}>{job.company ?? "—"}</td>
                  <td className={`${cellPaddingClass} text-gray-500`}>{SOURCE_LABEL[job.source]}</td>
                  <td className={cellPaddingClass}>
                    <DeadlineBadge deadline={job.deadline} />
                  </td>
                  <td className={cellPaddingClass}>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium leading-none ring-1 ring-inset ${statusStyle.className}`}
                    >
                      {statusStyle.label}
                    </span>
                  </td>
                  {showAiRejectReasons && <AiRejectReasonCell job={job} cellPaddingClass={cellPaddingClass} />}
                  <td className={`${cellPaddingClass} text-xs text-gray-400`} title={job.published_at ?? undefined}>
                    {job.published_at ? relativeTime(job.published_at) : "—"}
                  </td>
                  <td className={`${cellPaddingClass} text-xs text-gray-400`} title={job.created_at}>
                    {relativeTime(job.created_at)}
                  </td>
                  <td className={cellPaddingClass}>
                    <a
                      href={job.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex text-gray-400 transition-colors hover:text-periwinkle-700"
                    >
                      <HugeiconsIcon icon={LinkSquare01Icon} size={16} color="currentColor" strokeWidth={1.5} />
                    </a>
                  </td>
                  <td className={cellPaddingClass}>
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
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
