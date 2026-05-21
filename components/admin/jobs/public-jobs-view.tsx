"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Briefcase01Icon,
  Search01Icon,
  FilterIcon,
  LinkSquare01Icon,
  SparklesIcon,
  BookOpen01Icon,
} from "@hugeicons/core-free-icons";
import type { Database, JobSource } from "@/types/database.types";
import { SOURCE_LABEL } from "@/lib/jobs/constants";
import { relativeTime } from "@/lib/jobs/utils";
import Link from "next/link";

type JobPosting = Database["public"]["Tables"]["job_postings"]["Row"];

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
  const [selectedSource, setSelectedSource] = useState<"all" | JobSource>("all");

  // 검색 및 필터 필터링
  const filteredJobs = initialJobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      (job.company && job.company.toLowerCase().includes(search.toLowerCase()));
    const matchesSource = selectedSource === "all" || job.source === selectedSource;
    return matchesSearch && matchesSource;
  });

  const sources: ("all" | JobSource)[] = [
    "all",
    "mediajob_announcer",
    "arang",
    "saramin",
    "jobkorea",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-periwinkle-50/30 p-4 md:p-8">
      {/* Header section with Premium Glow */}
      <div className="relative mb-8 overflow-hidden rounded-3xl bg-white border border-gray-100 p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-periwinkle-200/40 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-60 w-60 rounded-full bg-pink-100/30 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-periwinkle-50 px-3 py-1 text-xs font-semibold text-periwinkle-700">
              <HugeiconsIcon icon={SparklesIcon} size={12} color="currentColor" />
              <span>Director&apos;s Eye Curation</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">
              방송 채용 정보 센터
            </h1>
            <p className="text-sm font-medium text-gray-500 max-w-xl">
              원장님의 예리한 시선으로 엄선된 지상파, 아나운서, 기상캐스터, 앵커, 매체 전문 신뢰할 수 있는 공고만을 모았습니다.
            </p>
          </div>

          {/* CTA Card for Guest/Non-logins */}
          {(!isLoggedIn || userRole === "guest") && (
            <div className="shrink-0 max-w-xs rounded-2xl bg-gradient-to-r from-periwinkle-600 to-indigo-600 p-4 text-white shadow-md">
              <h3 className="text-xs font-bold flex items-center gap-1">
                <HugeiconsIcon icon={BookOpen01Icon} size={14} color="currentColor" />
                <span>수강생 전용 혜택</span>
              </h3>
              <p className="mt-1 text-[11px] leading-snug text-periwinkle-100">
                아카데미 수강생 권한을 획득하시면 엄선된 1:1 연습 원고 및 포트폴리오용 명품 원고 라이브러리에 접근할 수 있습니다.
              </p>
              <div className="mt-3">
                <Link
                  href={isLoggedIn ? "/dashboard" : "/login"}
                  className="inline-block w-full text-center rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-periwinkle-700 transition-transform active:scale-95 hover:bg-periwinkle-50"
                >
                  {isLoggedIn ? "수강생 등업 신청하기" : "1초 로그인 & 등업신청"}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
            <HugeiconsIcon icon={Search01Icon} size={16} color="currentColor" />
          </span>
          <input
            type="text"
            placeholder="회사명 또는 채용 공고 제목 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-10 pr-4 text-sm font-medium text-gray-800 placeholder-gray-400 outline-none transition-all focus:border-periwinkle-500 focus:bg-white focus:ring-1 focus:ring-periwinkle-500"
          />
        </div>

        {/* Source Pills */}
        <div className="flex w-full md:w-auto items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="hidden lg:flex items-center gap-1 text-xs font-bold text-gray-500 mr-2 shrink-0">
            <HugeiconsIcon icon={FilterIcon} size={14} color="currentColor" />
            <span>매체 소스:</span>
          </span>
          {sources.map((src) => {
            const isActive = selectedSource === src;
            return (
              <button
                key={src}
                onClick={() => setSelectedSource(src)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? "bg-periwinkle-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {src === "all" ? "전체" : SOURCE_LABEL[src] ?? src}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid List */}
      {filteredJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400">
            <HugeiconsIcon icon={Briefcase01Icon} size={24} color="currentColor" />
          </span>
          <p className="mt-4 text-sm font-semibold text-gray-700">검색 조건에 맞는 공고가 없습니다.</p>
          <p className="mt-1 text-xs text-gray-400">키워드를 변경하거나 필터를 변경해 보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-periwinkle-200 hover:shadow-[0_12px_24px_-8px_rgba(104,117,245,0.08)]"
            >
              {/* Top Accent line on hover */}
              <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-periwinkle-500 to-indigo-500 opacity-0 transition-opacity group-hover:opacity-100" />

              <div>
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-block rounded-xl bg-gray-50 border border-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-500">
                    {SOURCE_LABEL[job.source] ?? "일반"}
                  </span>
                  <span className="text-[10px] font-medium text-gray-400">
                    {job.published_at ? relativeTime(job.published_at) : "방금 전"}
                  </span>
                </div>

                <h3 className="mt-4 text-base font-extrabold leading-snug text-gray-900 group-hover:text-periwinkle-700 transition-colors">
                  {job.title}
                </h3>

                <p className="mt-2 text-xs font-semibold text-gray-600">
                  {job.company ?? "언론사/미디어사"}
                </p>

                {job.location && (
                  <p className="mt-1 text-[11px] font-medium text-gray-400">
                    📍 {job.location}
                  </p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                <span className="text-xs font-bold text-coral-500 bg-coral-50/50 px-2 py-0.5 rounded-md text-red-500">
                  📅 마감: {job.deadline ?? "상시 채용"}
                </span>

                <a
                  href={job.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-periwinkle-50 text-periwinkle-700 transition-all hover:bg-periwinkle-600 hover:text-white"
                  title="원문 공고 확인"
                >
                  <HugeiconsIcon icon={LinkSquare01Icon} size={14} color="currentColor" strokeWidth={2} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
