"use client";

/**
 * 공고 관리 테이블 컴포넌트.
 * 행별 승인/거절/재검토/삭제, 일괄 액션, 소스 필터 탭을 포함.
 * useAsyncAction 훅으로 모든 버튼이 글로벌 Progress Bar와 연동된다.
 */

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAsyncAction } from "@/lib/ui/use-async-action";
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
  deleteRejectedJobPostings,
} from "@/app/(admin)/jobs/actions";
import { parseAiFitSnapshot } from "@/lib/ai/job-fit/domain/ai-fit-snapshot";
import type { Database, JobStatus } from "@/types/database.types";
import { SOURCE_LABEL, STATUS_STYLE } from "@/lib/jobs/constants";
import { AiPostPromptCopyButton } from "./ai-post-prompt-copy-button";
import { NaverShareIconLink } from "./naver-share-icon-link";
import { buildBlogContent, buildNaverShareUrl } from "@/lib/jobs/naver-share";
import { getPublicSiteOrigin } from "@/lib/jobs/site-url";
import { TEXT_DEADLINE } from "@/lib/crawl/shared";
import { isExpiredDeadline } from "@/lib/jobs/deadline";
import { relativeTime } from "@/lib/jobs/utils";

type JobPosting = Database["public"]["Tables"]["job_postings"]["Row"];
const JOBS_PAGE_SIZE = 15;

const DeadlineBadge = ({ deadline }: { deadline: string | null }) => {
  if (!deadline) return <span className="text-gray-400">—</span>;

  if (TEXT_DEADLINE.has(deadline)) {
    return <span className="text-gray-500">{deadline}</span>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

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

const AiRejectReasonCell = ({
  job,
  cellPaddingClass,
}: {
  job: JobPosting;
  cellPaddingClass: string;
}) => {
  const snap = parseAiFitSnapshot(job.ai_fit_snapshot);
  if (!snap) {
    if (job.status === "pending") {
      return (
        <td className={`${cellPaddingClass} max-w-56 text-xs text-gray-400`}>
          AI 미실행
        </td>
      );
    }
    return (
      <td className={`${cellPaddingClass} max-w-56 text-xs text-gray-400`}>
        AI 기록 없음
      </td>
    );
  }
  return (
    <td className={`${cellPaddingClass} max-w-72 align-top text-xs text-gray-600`}>
      <ul className="list-inside list-disc space-y-0.5 leading-snug">
        {snap.reasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
      <p className="mt-1.5 tabular-nums text-[11px] text-gray-400">
        {snap.score}점 · {snap.model}
      </p>
    </td>
  );
};

const AiRejectReasonBlock = ({ job }: { job: JobPosting }) => {
  const snap = parseAiFitSnapshot(job.ai_fit_snapshot);

  if (!snap) {
    return (
      <p className="text-xs font-medium leading-snug text-gray-400">
        {job.status === "pending" ? "AI 미실행" : "AI 기록 없음"}
      </p>
    );
  }

  return (
    <div className="space-y-1 text-xs leading-snug text-gray-600">
      <ul className="list-inside list-disc space-y-0.5">
        {snap.reasons.slice(0, 2).map((reason, index) => (
          <li key={index}>{reason}</li>
        ))}
      </ul>
      <p className="tabular-nums text-[11px] text-gray-400">
        {snap.score}점 · {snap.model}
      </p>
    </div>
  );
};

const RowActions = ({
  jobId,
  jobTitle,
  company,
  location,
  deadline,
  source,
  sourceUrl,
  status,
  publishedAt,
}: {
  jobId: string;
  jobTitle: string;
  company: string | null;
  location: string | null;
  deadline: string | null;
  source: JobPosting["source"];
  sourceUrl: string;
  status: JobStatus;
  publishedAt: string | null;
}) => {
  const router = useRouter();
  const { isPending, runAction } = useAsyncAction();

  const handle = (next: JobStatus) => {
    runAction(async () => {
      await updateJobStatus(jobId, next);
      router.refresh();
    });
  };

  const handlePublish = () => {
    runAction(async () => {
      await markJobsPublished([jobId]);
      router.refresh();
    });
  };

  const canShareToNaver = status === "approved" && Boolean(publishedAt);
  const siteOrigin = getPublicSiteOrigin();
  const naverShareUrl =
    canShareToNaver && siteOrigin
      ? buildNaverShareUrl(
          {
            id: jobId,
            title: jobTitle,
            company,
            location,
            deadline,
            source,
            source_url: sourceUrl,
          },
          siteOrigin,
        )
      : "";
  const naverDraftContent = canShareToNaver
    ? buildBlogContent({
        title: jobTitle,
        company,
        location,
        deadline,
        source,
        source_url: sourceUrl,
      })
    : "";

  if (status === "pending") {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1">
        <button
          onClick={() => void handle("approved")}
          disabled={isPending}
          title="승인"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} color="currentColor" strokeWidth={1.8} />
        </button>
        <button
          onClick={() => void handle("rejected")}
          disabled={isPending}
          title="거절"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={16} color="currentColor" strokeWidth={1.8} />
        </button>
      </div>
    );
  }

  if (status === "rejected") {
    const handleDelete = () => {
      if (!window.confirm("이 거절 공고를 DB에서 삭제할까요? 복구할 수 없습니다.")) return;
      runAction(async () => {
        await deleteRejectedJobPostings([jobId]);
        router.refresh();
      });
    };

    return (
      <div className="flex flex-wrap items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={isPending}
          title="DB에서 삭제"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <HugeiconsIcon icon={Delete01Icon} size={16} color="currentColor" strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={() => void handle("pending")}
          disabled={isPending}
          title="재검토"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <HugeiconsIcon icon={ArrowTurnBackwardIcon} size={15} color="currentColor" strokeWidth={1.8} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {status === "approved" && !publishedAt && (
        <button
          onClick={handlePublish}
          disabled={isPending}
          title="내부 게시"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-periwinkle-100 hover:text-periwinkle-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <HugeiconsIcon icon={JobShareIcon} size={16} color="currentColor" strokeWidth={1.8} />
        </button>
      )}
      {canShareToNaver && naverShareUrl && (
        <NaverShareIconLink
          href={naverShareUrl}
          title={`네이버 공유하기\n\n${naverDraftContent}`}
          iconType="a"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md transition-opacity hover:bg-emerald-50 hover:opacity-90"
        />
      )}
      {canShareToNaver && <AiPostPromptCopyButton jobId={jobId} />}
      <button
        onClick={() => void handle("pending")}
        disabled={isPending}
        title="재검토"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <HugeiconsIcon icon={ArrowTurnBackwardIcon} size={15} color="currentColor" strokeWidth={1.8} />
      </button>
    </div>
  );
};

const MobileJobCard = ({
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
  const expired = isExpiredDeadline(job.deadline);

  return (
    <article
      className={`space-y-3 p-4 transition-colors ${
        isSelected ? "bg-periwinkle-50" : "bg-white"
      } ${expired ? "text-gray-400 opacity-75" : ""}`}
    >
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
          <h3 className="mt-2 text-sm font-extrabold leading-snug text-gray-900">
            {job.title}
          </h3>
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
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
            AI 사유
          </p>
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
        <RowActions
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

type Props = {
  jobs: JobPosting[];
  /** AI 적합도 스냅샷 사유 컬럼 표시 */
  showAiRejectReasons?: boolean;
  sourceHeader?: ReactNode;
  emptyState?: ReactNode;
};

export const JobsTable = ({ jobs, showAiRejectReasons = false, sourceHeader, emptyState }: Props) => {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { isPending: isBulkPending, runAction: runBulkAction } = useAsyncAction();
  const [query, setQuery] = useState("");
  const [density, setDensity] = useState<"compact" | "comfortable">("compact");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        (j.company ?? "").toLowerCase().includes(q),
    );
  }, [jobs, query]);

  const selectionAllRejected = useMemo(() => {
    if (selectedIds.size === 0) return false;
    for (const id of selectedIds) {
      const j = jobs.find((x) => x.id === id);
      if (!j || j.status !== "rejected") return false;
    }
    return true;
  }, [selectedIds, jobs]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / JOBS_PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const pageStart = (currentPage - 1) * JOBS_PAGE_SIZE;
  const pageItems = useMemo(
    () => filtered.slice(pageStart, pageStart + JOBS_PAGE_SIZE),
    [filtered, pageStart],
  );
  const pageIds = useMemo(() => new Set(pageItems.map((j) => j.id)), [pageItems]);
  const selectedOnPageCount = pageItems.filter((j) => selectedIds.has(j.id)).length;
  const allSelected = pageItems.length > 0 && selectedOnPageCount === pageItems.length;
  const someSelected = selectedOnPageCount > 0 && !allSelected;
  const visibleStart = filtered.length === 0 ? 0 : pageStart + 1;
  const visibleEnd = Math.min(pageStart + pageItems.length, filtered.length);

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of pageIds) next.delete(id);
        return next;
      });
    } else {
      setSelectedIds(new Set(pageItems.map((j) => j.id)));
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
    runBulkAction(async () => {
      await bulkUpdateJobStatus(Array.from(selectedIds), status);
      setSelectedIds(new Set());
      router.refresh();
    });
  };

  const handleBulkPublish = () => {
    runBulkAction(async () => {
      await markJobsPublished(Array.from(selectedIds));
      setSelectedIds(new Set());
      router.refresh();
    });
  };

  const handleBulkDeleteRejected = () => {
    const n = selectedIds.size;
    if (
      !window.confirm(`선택한 ${n}건의 거절 공고를 DB에서 삭제할까요? 복구할 수 없습니다.`)
    ) {
      return;
    }
    runBulkAction(async () => {
      await deleteRejectedJobPostings(Array.from(selectedIds));
      setSelectedIds(new Set());
      router.refresh();
    });
  };

  if (jobs.length === 0 && !sourceHeader && !emptyState) return null;

  const showToolbar = jobs.length > 0;
  const showHeaderBlock = Boolean(sourceHeader) || showToolbar;
  const tableColSpan = showAiRejectReasons ? 11 : 10;

  const cellPaddingClass = density === "compact" ? "px-3 py-2" : "px-4 py-3";
  const toolbarButtonClass =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-none transition-colors";

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:rounded-3xl">
      {showHeaderBlock && (
        <div className="border-b border-gray-200 bg-gray-50/60">
          {sourceHeader && <div className="px-4 py-2.5">{sourceHeader}</div>}
          {showToolbar && (
            <div
              className={`flex flex-col gap-3 px-4 py-3 md:flex-row md:flex-wrap md:items-center md:py-2.5 ${
                sourceHeader ? "border-t border-gray-200" : ""
              }`}
            >
        <div className="relative w-full md:max-w-xs md:flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-gray-400">
            <HugeiconsIcon icon={Search01Icon} size={14} color="currentColor" strokeWidth={2} />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
              setSelectedIds(new Set());
            }}
            placeholder="공고명 또는 회사명 검색…"
            className="w-full rounded-full border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-periwinkle-400 focus:outline-none focus:ring-2 focus:ring-periwinkle-100"
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:flex-1">
            <span className="text-sm font-medium text-gray-700">
              {selectedIds.size}개 선택됨
            </span>
            <div className="hidden h-3.5 w-px bg-gray-200 md:block" />
            <button
              onClick={() => handleBulk("approved")}
              disabled={isBulkPending}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-3 py-2 text-xs font-medium leading-none text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:py-1.5"
            >
              <HugeiconsIcon icon={Tick02Icon} size={13} color="currentColor" strokeWidth={2} />
              일괄 승인
            </button>
            <button
              onClick={() => handleBulk("rejected")}
              disabled={isBulkPending}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-red-500 px-3 py-2 text-xs font-medium leading-none text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:py-1.5"
            >
              <HugeiconsIcon icon={Delete01Icon} size={13} color="currentColor" strokeWidth={2} />
              일괄 거절
            </button>
            {selectionAllRejected && (
              <button
                type="button"
                onClick={() => void handleBulkDeleteRejected()}
                disabled={isBulkPending}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-red-300 bg-white px-3 py-2 text-xs font-medium leading-none text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:py-1.5"
              >
                <HugeiconsIcon icon={Delete01Icon} size={13} color="currentColor" strokeWidth={2} />
                선택 거절 삭제
              </button>
            )}
            <button
              onClick={handleBulkPublish}
              disabled={isBulkPending}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-periwinkle-200 bg-periwinkle-100 px-3 py-2 text-xs font-medium leading-none text-periwinkle-700 transition-colors hover:bg-periwinkle-200 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:py-1.5"
            >
              <HugeiconsIcon icon={JobShareIcon} size={13} color="currentColor" strokeWidth={2} />
              일괄 내부 게시
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              disabled={isBulkPending}
              className="inline-flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-600 md:ml-auto"
            >
              <HugeiconsIcon icon={MultiplicationSignIcon} size={12} color="currentColor" strokeWidth={2} />
              선택 해제
            </button>
          </div>
        )}

        {selectedIds.size === 0 && (
          <span className="text-xs text-gray-400 tabular-nums md:ml-auto">
            {visibleStart}-{visibleEnd} / {filtered.length}건
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
                ? "border-gray-300 bg-white text-gray-700"
                : "border-transparent text-gray-400 hover:text-gray-600"
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
                ? "border-gray-300 bg-white text-gray-700"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            여유
          </button>
        </div>
            </div>
          )}
        </div>
      )}

      {showToolbar ? (
      <>
      <div className="divide-y divide-gray-100 md:hidden">
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-400">
            &ldquo;{query}&rdquo; 에 해당하는 공고가 없습니다.
          </div>
        ) : (
          pageItems.map((job) => (
            <MobileJobCard
              key={job.id}
              job={job}
              isSelected={selectedIds.has(job.id)}
              showAiRejectReasons={showAiRejectReasons}
              onToggle={() => toggleOne(job.id)}
            />
          ))
        )}
      </div>
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
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 accent-periwinkle-600"
                />
              </th>
              <th className={cellPaddingClass}>공고명</th>
              <th className={cellPaddingClass}>회사</th>
              <th className={cellPaddingClass}>소스</th>
              <th className={cellPaddingClass}>마감일</th>
              <th className={cellPaddingClass}>상태</th>
              {showAiRejectReasons && (
                <th className={cellPaddingClass}>AI 사유</th>
              )}
              <th className={cellPaddingClass}>내부 게시 시각</th>
              <th className={cellPaddingClass}>수집일</th>
              <th className={cellPaddingClass}>링크</th>
              <th className={cellPaddingClass}>액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={tableColSpan} className="py-12 text-center text-sm text-gray-400">
                  &ldquo;{query}&rdquo; 에 해당하는 공고가 없습니다.
                </td>
              </tr>
            ) : (
              pageItems.map((job) => {
                const statusStyle = STATUS_STYLE[job.status];
                const isSelected = selectedIds.has(job.id);
                const expired = isExpiredDeadline(job.deadline);
                return (
                  <tr
                    key={job.id}
                    className={`transition-colors hover:bg-gray-50/60 ${
                      isSelected ? "bg-periwinkle-50" : ""
                    } ${expired ? "text-gray-400 opacity-70" : ""}`}
                  >
                    <td className={cellPaddingClass}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(job.id)}
                        className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 accent-periwinkle-600"
                      />
                    </td>
                    <td className={`${cellPaddingClass} font-medium text-gray-800`}>
                      {job.title}
                      {job.location && (
                        <span className="ml-2 text-xs text-gray-400">{job.location}</span>
                      )}
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
                    {showAiRejectReasons && (
                      <AiRejectReasonCell job={job} cellPaddingClass={cellPaddingClass} />
                    )}
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
                      <RowActions
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
      <div className="flex flex-col gap-2 border-t border-gray-200 bg-gray-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-gray-500 tabular-nums">
          {visibleStart}-{visibleEnd} / {filtered.length}건
          {query && jobs.length !== filtered.length ? ` (전체 ${jobs.length}건)` : ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            이전
          </button>
          <span className="min-w-16 text-center text-xs font-semibold text-gray-700 tabular-nums">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            다음
          </button>
        </div>
      </div>
      </>
      ) : (
        emptyState
      )}
    </div>
  );
};
