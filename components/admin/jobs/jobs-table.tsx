"use client";

/**
 * 공고 관리 테이블의 상태 조립 컴포넌트.
 * 검색, 페이지, 선택 상태를 계산하고 실제 렌더링은 하위 테이블/카드/툴바 컴포넌트로 위임한다.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  bulkUpdateJobStatus,
  deleteRejectedJobPostings,
  markJobsPublished,
} from "@/app/(admin)/jobs/actions";
import { useAsyncAction } from "@/lib/ui/use-async-action";
import { isExpiredDeadline } from "@/lib/jobs/deadline";
import type { JobStatus } from "@/types/database.types";
import { DesktopJobsTable } from "./desktop-jobs-table";
import { JobsTablePagination } from "./jobs-table-pagination";
import { JobsTableToolbar } from "./jobs-table-toolbar";
import { MobileJobCard } from "./mobile-job-card";
import {
  JOBS_PAGE_SIZE,
  type JobsTableDensity,
  type JobsTableProps,
} from "./jobs-table-types";

export const JobsTable = ({
  jobs,
  showAiRejectReasons = false,
  sourceHeader,
  emptyState,
}: JobsTableProps) => {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { isPending: isBulkPending, runAction: runBulkAction } = useAsyncAction();
  const [query, setQuery] = useState("");
  const [density, setDensity] = useState<JobsTableDensity>("compact");
  const [page, setPage] = useState(1);

  const activeJobs = useMemo(
    () => jobs.filter((job) => !isExpiredDeadline(job.deadline)),
    [jobs],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeJobs;
    return activeJobs.filter(
      (job) =>
        job.title.toLowerCase().includes(q) ||
        (job.company ?? "").toLowerCase().includes(q),
    );
  }, [activeJobs, query]);

  const selectionAllRejected = useMemo(() => {
    if (selectedIds.size === 0) return false;
    for (const id of selectedIds) {
      const job = activeJobs.find((item) => item.id === id);
      if (!job || job.status !== "rejected") return false;
    }
    return true;
  }, [activeJobs, selectedIds]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / JOBS_PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const pageStart = (currentPage - 1) * JOBS_PAGE_SIZE;
  const pageItems = useMemo(
    () => filtered.slice(pageStart, pageStart + JOBS_PAGE_SIZE),
    [filtered, pageStart],
  );
  const pageIds = useMemo(() => new Set(pageItems.map((job) => job.id)), [pageItems]);
  const selectedOnPageCount = pageItems.filter((job) => selectedIds.has(job.id)).length;
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
      return;
    }
    setSelectedIds(new Set(pageItems.map((job) => job.id)));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
    clearSelection();
  };

  const handleBulk = (status: JobStatus) => {
    runBulkAction(async () => {
      await bulkUpdateJobStatus(Array.from(selectedIds), status);
      clearSelection();
      router.refresh();
    });
  };

  const handleBulkPublish = () => {
    runBulkAction(async () => {
      await markJobsPublished(Array.from(selectedIds));
      clearSelection();
      router.refresh();
    });
  };

  const handleBulkDeleteRejected = () => {
    const count = selectedIds.size;
    if (!window.confirm(`선택한 ${count}건의 거절 공고를 DB에서 삭제할까요? 복구할 수 없습니다.`)) {
      return;
    }
    runBulkAction(async () => {
      await deleteRejectedJobPostings(Array.from(selectedIds));
      clearSelection();
      router.refresh();
    });
  };

  if (activeJobs.length === 0 && !sourceHeader && !emptyState) return null;

  const showToolbar = activeJobs.length > 0;
  const showHeaderBlock = Boolean(sourceHeader) || showToolbar;
  const cellPaddingClass = density === "compact" ? "px-3 py-2" : "px-4 py-3";

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
              <JobsTableToolbar
                query={query}
                visibleStart={visibleStart}
                visibleEnd={visibleEnd}
                filteredCount={filtered.length}
                activeCount={activeJobs.length}
                selectedCount={selectedIds.size}
                selectionAllRejected={selectionAllRejected}
                isBulkPending={isBulkPending}
                density={density}
                onQueryChange={handleQueryChange}
                onBulkStatus={handleBulk}
                onBulkPublish={handleBulkPublish}
                onBulkDeleteRejected={handleBulkDeleteRejected}
                onClearSelection={clearSelection}
                onDensityChange={setDensity}
              />
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
          <DesktopJobsTable
            jobs={pageItems}
            query={query}
            selectedIds={selectedIds}
            allSelected={allSelected}
            someSelected={someSelected}
            showAiRejectReasons={showAiRejectReasons}
            cellPaddingClass={cellPaddingClass}
            onToggleAll={toggleAll}
            onToggleOne={toggleOne}
          />
          <JobsTablePagination
            visibleStart={visibleStart}
            visibleEnd={visibleEnd}
            filteredCount={filtered.length}
            activeCount={activeJobs.length}
            query={query}
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={() => setPage(Math.max(1, currentPage - 1))}
            onNext={() => setPage(Math.min(totalPages, currentPage + 1))}
          />
        </>
      ) : (
        emptyState
      )}
    </div>
  );
};
