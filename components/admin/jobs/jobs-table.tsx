"use client";

/**
 * 공고 관리 테이블의 선택, 검색 URL 갱신, 일괄 작업 상태를 관리합니다.
 * 목록 데이터와 페이지네이션은 서버에서 계산된 현재 페이지 결과만 사용합니다.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  bulkUpdateJobStatus,
  deleteRejectedJobPostings,
  markJobsPublished,
} from "@/app/(admin)/jobs/actions";
import { SkeletonTable } from "@/components/ui/skeleton";
import { useAsyncAction } from "@/lib/ui/use-async-action";
import { useLoading } from "@/lib/ui/loading-context";
import { isExpiredDeadline } from "@/lib/jobs/deadline";
import type { JobStatus } from "@/types/database.types";
import { DesktopJobsTable } from "./desktop-jobs-table";
import { JobsTablePagination } from "./jobs-table-pagination";
import { JobsTableToolbar } from "./jobs-table-toolbar";
import { MobileJobCard } from "./mobile-job-card";
import type { JobsTableDensity, JobsTableProps } from "./jobs-table-types";

export const JobsTable = ({
  jobs,
  query,
  pagination,
  ...props
}: JobsTableProps) => {
  const stateKey = [
    query,
    pagination.currentPage,
    jobs.map((job) => job.id).join("|"),
  ].join(":");

  return (
    <JobsTableContent
      key={stateKey}
      jobs={jobs}
      query={query}
      pagination={pagination}
      {...props}
    />
  );
};

const JobsTableContent = ({
  jobs,
  query: initialQuery,
  pagination,
  showAiRejectReasons = false,
  sourceHeader,
  emptyState,
}: JobsTableProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isNavigating, startNavigation } = useLoading();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { isPending: isBulkPending, runAction: runBulkAction } = useAsyncAction();
  const [query, setQuery] = useState(initialQuery);
  const [density, setDensity] = useState<JobsTableDensity>("compact");
  const queryTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (queryTimerRef.current !== null) {
        window.clearTimeout(queryTimerRef.current);
      }
    };
  }, []);

  const activeJobs = useMemo(
    () => jobs.filter((job) => !isExpiredDeadline(job.deadline)),
    [jobs],
  );

  const selectionAllRejected = useMemo(() => {
    if (selectedIds.size === 0) return false;
    for (const id of selectedIds) {
      const job = activeJobs.find((item) => item.id === id);
      if (!job || job.status !== "rejected") return false;
    }
    return true;
  }, [activeJobs, selectedIds]);

  const currentPage = pagination.currentPage;
  const totalPages = pagination.totalPages;
  const pageItems = activeJobs;
  const pageIds = useMemo(() => new Set(pageItems.map((job) => job.id)), [pageItems]);
  const selectedOnPageCount = pageItems.filter((job) => selectedIds.has(job.id)).length;
  const allSelected = pageItems.length > 0 && selectedOnPageCount === pageItems.length;
  const someSelected = selectedOnPageCount > 0 && !allSelected;

  const buildHref = (updates: { page?: number; query?: string }) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (updates.page !== undefined) {
      if (updates.page > 1) nextParams.set("page", String(updates.page));
      else nextParams.delete("page");
    }

    if (updates.query !== undefined) {
      const trimmed = updates.query.trim();
      if (trimmed) nextParams.set("q", trimmed);
      else nextParams.delete("q");
      nextParams.delete("page");
    }

    const nextSearch = nextParams.toString();
    return `${pathname}${nextSearch ? `?${nextSearch}` : ""}`;
  };

  const navigateTo = (href: string) => {
    const currentSearch = searchParams.toString();
    const currentHref = `${pathname}${currentSearch ? `?${currentSearch}` : ""}`;
    if (href === currentHref) return;
    startNavigation();
    router.push(href);
  };

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
    clearSelection();
    if (queryTimerRef.current !== null) {
      window.clearTimeout(queryTimerRef.current);
    }
    queryTimerRef.current = window.setTimeout(() => {
      navigateTo(buildHref({ query: value }));
    }, 350);
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

  if (isNavigating) {
    return (
      <div role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">공고 목록을 불러오는 중입니다.</span>
        <SkeletonTable rows={10} cols={11} />
      </div>
    );
  }

  if (activeJobs.length === 0 && !sourceHeader && !emptyState && !query) return null;

  const showToolbar = activeJobs.length > 0 || query.length > 0 || pagination.totalCount > 0;
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
                visibleStart={pagination.visibleStart}
                visibleEnd={pagination.visibleEnd}
                filteredCount={pagination.totalCount}
                activeCount={pagination.totalCount}
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
            {pageItems.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-gray-400">
                &ldquo;{query}&rdquo;에 해당하는 공고가 없습니다.
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
            visibleStart={pagination.visibleStart}
            visibleEnd={pagination.visibleEnd}
            filteredCount={pagination.totalCount}
            activeCount={pagination.totalCount}
            query={query}
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={() => navigateTo(buildHref({ page: Math.max(1, currentPage - 1) }))}
            onNext={() => navigateTo(buildHref({ page: Math.min(totalPages, currentPage + 1) }))}
          />
        </>
      ) : (
        emptyState
      )}
    </div>
  );
};
