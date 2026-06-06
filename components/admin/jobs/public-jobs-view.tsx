"use client";

import { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BookOpen01Icon,
  Briefcase01Icon,
  LinkSquare01Icon,
  Search01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import type { Database } from "@/types/database.types";
import { relativeTime } from "@/lib/jobs/utils";

type JobPosting = Database["public"]["Tables"]["job_postings"]["Row"];

const PUBLIC_JOBS_PAGE_SIZE = 15;

export function PublicJobsView({
  initialJobs,
  isLoggedIn,
  userRole,
}: {
  initialJobs: JobPosting[];
  isLoggedIn: boolean;
  userRole: "admin" | "student" | "guest";
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filteredJobs = initialJobs.filter((job) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      job.title.toLowerCase().includes(q) ||
      (job.company ?? "").toLowerCase().includes(q);
    return matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PUBLIC_JOBS_PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const pageStart = (currentPage - 1) * PUBLIC_JOBS_PAGE_SIZE;
  const visibleJobs = filteredJobs.slice(pageStart, pageStart + PUBLIC_JOBS_PAGE_SIZE);
  const visibleStart = filteredJobs.length === 0 ? 0 : pageStart + 1;
  const visibleEnd = Math.min(pageStart + visibleJobs.length, filteredJobs.length);

  const resetPaging = () => setPage(1);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-bg p-3 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:p-4 sm:pb-[calc(7rem+env(safe-area-inset-bottom))] md:p-8 md:pb-8">
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:mb-6 md:rounded-3xl md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-periwinkle-50 px-3 py-1 text-xs font-semibold text-periwinkle-700">
              <HugeiconsIcon icon={SparklesIcon} size={12} color="currentColor" />
              <span>Director&apos;s Eye Curation</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900 md:text-3xl">
              방송 채용 정보 필터
            </h1>
            <p className="max-w-xl text-sm font-medium leading-snug text-gray-500">
              원장의 안목으로 우선 선별한 지상파, 아나운서, 기상캐스터, 리포터, 매체 전문 채용 공고를 모았습니다.
            </p>
          </div>

          {(!isLoggedIn || userRole === "guest") && (
            <div className="shrink-0 rounded-2xl border border-periwinkle-200 bg-periwinkle-50 p-4 text-periwinkle-900 md:max-w-xs">
              <h3 className="flex items-center gap-1 text-xs font-bold text-periwinkle-800">
                <HugeiconsIcon icon={BookOpen01Icon} size={14} color="currentColor" />
                <span>수강생 전용 혜택</span>
              </h3>
              <p className="mt-1 text-[11px] font-medium leading-snug text-periwinkle-700">
                수강생 권한을 받으면 우선순위 1:1 연습 자료와 포트폴리오용 원고 라이브러리에 접근할 수 있습니다.
              </p>
              <Link
                href={isLoggedIn ? "/dashboard" : "/login"}
                className="mt-3 inline-flex w-full justify-center rounded-full bg-periwinkle-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-periwinkle-700"
              >
                {isLoggedIn ? "수강생 승인 요청하기" : "로그인하고 승인 요청"}
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm md:mb-6 md:flex-row md:items-center md:gap-4 md:p-4">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
            <HugeiconsIcon icon={Search01Icon} size={16} color="currentColor" />
          </span>
          <input
            type="text"
            placeholder="회사명 또는 채용 공고 제목 검색"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPaging();
            }}
            className="w-full rounded-full border border-gray-200 bg-gray-50/50 py-2 pl-10 pr-4 text-sm font-medium text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-periwinkle-500 focus:bg-white focus:ring-1 focus:ring-periwinkle-500"
          />
        </div>
      </div>

      {filteredJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400">
            <HugeiconsIcon icon={Briefcase01Icon} size={24} color="currentColor" />
          </span>
          <p className="mt-4 text-sm font-semibold text-gray-700">검색 조건에 맞는 공고가 없습니다.</p>
          <p className="mt-1 text-xs text-gray-400">검색 키워드를 확인해 보세요.</p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between text-xs text-gray-500 tabular-nums">
            <span>
              {visibleStart}-{visibleEnd} / {filteredJobs.length}건
            </span>
            {filteredJobs.length > PUBLIC_JOBS_PAGE_SIZE && (
              <span>{currentPage} / {totalPages}</span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
            {visibleJobs.map((job) => (
              <div
                key={job.id}
                className="group flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-periwinkle-200 hover:bg-periwinkle-50/20 md:rounded-3xl md:p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[10px] font-medium text-gray-400 ml-auto">
                      {job.published_at ? relativeTime(job.published_at) : "방금 전"}
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-extrabold leading-snug text-gray-900 transition-colors group-hover:text-periwinkle-700">
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
                  </h3>

                  <p className="mt-2 text-xs font-semibold text-gray-600">
                    {job.company ?? "언론/미디어사"}
                  </p>

                  {job.location && (
                    <p className="mt-1 text-[11px] font-medium text-gray-400">
                      {job.location}
                    </p>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-4 md:mt-6">
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-500">
                    마감: {job.deadline ?? "상시 채용"}
                  </span>

                  <a
                    href={job.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-periwinkle-200 bg-white text-periwinkle-700 transition-colors hover:bg-periwinkle-600 hover:text-white"
                    title="원문 공고 확인"
                  >
                    <HugeiconsIcon icon={LinkSquare01Icon} size={14} color="currentColor" strokeWidth={2} />
                  </a>
                </div>
              </div>
            ))}
          </div>
          {filteredJobs.length > PUBLIC_JOBS_PAGE_SIZE && (
            <div className="mt-6 flex items-center justify-center gap-2">
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
          )}
        </>
      )}
    </div>
  );
}
