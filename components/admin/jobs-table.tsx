"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  Cancel01Icon,
  ArrowTurnBackwardIcon,
  LinkSquare01Icon,
  Tick02Icon,
  Delete01Icon,
  MultiplicationSignIcon,
  Search01Icon,
  JobShareIcon,
} from "@hugeicons/core-free-icons";
import {
  updateJobStatus,
  bulkUpdateJobStatus,
  markJobsPublished,
} from "@/app/(admin)/jobs/actions";
import type { Database, JobStatus } from "@/types/database.types";
import { SOURCE_LABEL, STATUS_STYLE } from "@/lib/jobs/constants";
import { TEXT_DEADLINE } from "@/lib/crawl/shared";
import { relativeTime } from "@/lib/jobs/utils";

type JobPosting = Database["public"]["Tables"]["job_postings"]["Row"];

const DeadlineBadge = ({ deadline }: { deadline: string | null }) => {
  if (!deadline) return <span className="text-slate-400">—</span>;

  if (TEXT_DEADLINE.has(deadline)) {
    return <span className="text-slate-500">{deadline}</span>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return <span className="text-slate-400 line-through">{deadline}</span>;
  }
  if (diffDays === 0) {
    return (
      <span className="inline-flex items-center rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-600 ring-1 ring-red-200">
        D-day
      </span>
    );
  }
  if (diffDays <= 3) {
    return (
      <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-600 ring-1 ring-amber-200">
        D-{diffDays}
      </span>
    );
  }
  return <span className="text-xs text-slate-500">{deadline}</span>;
};

const RowActions = ({
  jobId,
  status,
  publishedAt,
}: {
  jobId: string;
  status: JobStatus;
  publishedAt: string | null;
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handle = (next: JobStatus) => {
    startTransition(async () => {
      await updateJobStatus(jobId, next);
      router.refresh();
    });
  };

  const handlePublish = () => {
    startTransition(async () => {
      await markJobsPublished([jobId]);
      router.refresh();
    });
  };

  if (status === "pending") {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => void handle("approved")}
          disabled={isPending}
          title="승인"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} color="currentColor" strokeWidth={1.8} />
        </button>
        <button
          onClick={() => void handle("rejected")}
          disabled={isPending}
          title="거절"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={16} color="currentColor" strokeWidth={1.8} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {status === "approved" && !publishedAt && (
        <button
          onClick={handlePublish}
          disabled={isPending}
          title="게시(내부 표시)"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-sky-50 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <HugeiconsIcon icon={JobShareIcon} size={16} color="currentColor" strokeWidth={1.8} />
        </button>
      )}
      <button
        onClick={() => void handle("pending")}
        disabled={isPending}
        title="재검토"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <HugeiconsIcon icon={ArrowTurnBackwardIcon} size={15} color="currentColor" strokeWidth={1.8} />
      </button>
    </div>
  );
};

type Props = {
  jobs: JobPosting[];
};

export const JobsTable = ({ jobs }: Props) => {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkPending, startBulkTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        (j.company ?? "").toLowerCase().includes(q),
    );
  }, [jobs, query]);

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((j) => j.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulk = (status: JobStatus) => {
    startBulkTransition(async () => {
      await bulkUpdateJobStatus(Array.from(selectedIds), status);
      setSelectedIds(new Set());
      router.refresh();
    });
  };

  const handleBulkPublish = () => {
    startBulkTransition(async () => {
      await markJobsPublished(Array.from(selectedIds));
      setSelectedIds(new Set());
      router.refresh();
    });
  };

  if (jobs.length === 0) return null;

  const cellPaddingClass = density === "compact" ? "px-3 py-2" : "px-4 py-3";
  const toolbarButtonClass =
    "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      {/* Toolbar: search + bulk actions */}
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
        <div className="relative flex-1 max-w-xs">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-slate-400">
            <HugeiconsIcon icon={Search01Icon} size={14} color="currentColor" strokeWidth={2} />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIds(new Set());
            }}
            placeholder="공고명 또는 회사명 검색…"
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {selectedIds.size > 0 && (
          <>
            <span className="text-sm font-medium text-slate-700">
              {selectedIds.size}개 선택됨
            </span>
            <div className="h-3.5 w-px bg-slate-200" />
            <button
              onClick={() => handleBulk("approved")}
              disabled={isBulkPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <HugeiconsIcon icon={Tick02Icon} size={13} color="currentColor" strokeWidth={2} />
              일괄 승인
            </button>
            <button
              onClick={() => handleBulk("rejected")}
              disabled={isBulkPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <HugeiconsIcon icon={Delete01Icon} size={13} color="currentColor" strokeWidth={2} />
              일괄 거절
            </button>
            <button
              onClick={handleBulkPublish}
              disabled={isBulkPending}
              className="inline-flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <HugeiconsIcon icon={JobShareIcon} size={13} color="currentColor" strokeWidth={2} />
              일괄 게시
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              disabled={isBulkPending}
              className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-slate-600"
            >
              <HugeiconsIcon icon={MultiplicationSignIcon} size={12} color="currentColor" strokeWidth={2} />
              선택 해제
            </button>
          </>
        )}

        {selectedIds.size === 0 && (
          <span className="ml-auto text-xs text-slate-400 tabular-nums">
            {filtered.length}건
            {query && jobs.length !== filtered.length && ` / 전체 ${jobs.length}건`}
          </span>
        )}

        <div className="flex shrink-0 items-center gap-1" role="group" aria-label="표 밀도">
          <button
            type="button"
            aria-pressed={density === "compact"}
            title="행 간격을 좁혀 한 화면에 더 많이 표시"
            onClick={() => setDensity("compact")}
            className={`${toolbarButtonClass} ${
              density === "compact"
                ? "border-slate-300 bg-white text-slate-700"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            촘촘함
          </button>
          <button
            type="button"
            aria-pressed={density === "comfortable"}
            title="행 간격을 넓혀 가독성을 높임"
            onClick={() => setDensity("comfortable")}
            className={`${toolbarButtonClass} ${
              density === "comfortable"
                ? "border-slate-300 bg-white text-slate-700"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            여유
          </button>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-auto overscroll-contain" tabIndex={0} role="region" aria-label="공고 목록">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium text-slate-500 shadow-sm">
              <th className={`w-10 ${cellPaddingClass}`}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 accent-indigo-600"
                />
              </th>
              <th className={cellPaddingClass}>공고명</th>
              <th className={cellPaddingClass}>회사</th>
              <th className={cellPaddingClass}>소스</th>
              <th className={cellPaddingClass}>마감일</th>
              <th className={cellPaddingClass}>상태</th>
              <th className={cellPaddingClass}>게시</th>
              <th className={cellPaddingClass}>수집일</th>
              <th className={cellPaddingClass}>링크</th>
              <th className={cellPaddingClass}>액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-sm text-slate-400">
                  &ldquo;{query}&rdquo; 에 해당하는 공고가 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((job) => {
                const statusStyle = STATUS_STYLE[job.status];
                const isSelected = selectedIds.has(job.id);
                return (
                  <tr
                    key={job.id}
                    className={`transition-colors hover:bg-slate-50/60 ${isSelected ? "bg-indigo-50/40" : ""}`}
                  >
                    <td className={cellPaddingClass}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(job.id)}
                        className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 accent-indigo-600"
                      />
                    </td>
                    <td className={`${cellPaddingClass} font-medium text-slate-800`}>
                      {job.title}
                      {job.location && (
                        <span className="ml-2 text-xs text-slate-400">{job.location}</span>
                      )}
                    </td>
                    <td className={`${cellPaddingClass} text-slate-600`}>{job.company ?? "—"}</td>
                    <td className={`${cellPaddingClass} text-slate-500`}>{SOURCE_LABEL[job.source]}</td>
                    <td className={cellPaddingClass}>
                      <DeadlineBadge deadline={job.deadline} />
                    </td>
                    <td className={cellPaddingClass}>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyle.className}`}
                      >
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className={`${cellPaddingClass} text-xs text-slate-400`} title={job.published_at ?? undefined}>
                      {job.published_at ? relativeTime(job.published_at) : "—"}
                    </td>
                    <td className={`${cellPaddingClass} text-xs text-slate-400`} title={job.created_at}>
                      {relativeTime(job.created_at)}
                    </td>
                    <td className={cellPaddingClass}>
                      <a
                        href={job.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex text-slate-400 transition-colors hover:text-indigo-500"
                      >
                        <HugeiconsIcon icon={LinkSquare01Icon} size={16} color="currentColor" strokeWidth={1.5} />
                      </a>
                    </td>
                    <td className={cellPaddingClass}>
                      <RowActions jobId={job.id} status={job.status} publishedAt={job.published_at} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
