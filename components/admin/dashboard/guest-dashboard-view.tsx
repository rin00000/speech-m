/**
 * 게스트·비로그인 사용자를 위한 대시보드 — "취업 준비 허브".
 * 채용 공고 요약 + 최신 공고 미리보기로 즉시 가치를 제공하고,
 * 등업 안내는 하단 보조 섹션으로 배치한다.
 */

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Briefcase01Icon,
  LinkSquare01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { Header } from "@/components/admin/layout/header";
import { InfoHint } from "@/components/ui/info-hint";
import { GuestUpgradeRequestCard } from "./guest-upgrade-request-card";
import { relativeTime } from "@/lib/jobs/utils";
import type { GuestDashboardData } from "@/lib/dashboard/guest-dashboard";

type GuestDashboardViewProps = {
  userName: string | null;
  isLoggedIn: boolean;
  data: GuestDashboardData;
};

export function GuestDashboardView({
  userName,
  isLoggedIn,
  data,
}: GuestDashboardViewProps) {
  const jobs = data.recentJobs;
  const jobCount = data.totalCount;
  const weeklyJobCount = data.recentWeekCount;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title="취업 준비 허브"
        description="방송·미디어 분야 채용 공고와 준비 현황을 한눈에 확인합니다."
      />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 md:space-y-6 md:p-6">
        {/* 환영 히어로 */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:rounded-3xl md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-periwinkle-50 px-3 py-1 text-xs font-semibold text-periwinkle-700">
                <HugeiconsIcon icon={SparklesIcon} size={12} color="currentColor" />
                <span>Director&apos;s Eye Curation</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <h2 className="min-w-0 text-xl font-extrabold tracking-tight text-gray-900 md:text-2xl">
                  {userName ? `${userName}님, 환영합니다!` : "방송 준비의 시작, Speech-M"}
                </h2>
                <InfoHint>
                  원장이 직접 선별한 지상파·아나운서·리포터·쇼호스트 채용 공고를 무료로 열람하세요.
                </InfoHint>
              </div>
            </div>

            <Link
              href="/jobs"
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-periwinkle-600 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-periwinkle-700"
            >
              전체 공고 보기
              <HugeiconsIcon icon={ArrowRight01Icon} size={15} color="currentColor" />
            </Link>
          </div>
        </section>

        {/* 공고 요약 통계 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              큐레이션 공고
            </p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-gray-900">
              {jobCount}<span className="ml-0.5 text-sm font-bold text-gray-400">건</span>
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              이번 주 신규
            </p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-periwinkle-600">
              {weeklyJobCount}<span className="ml-0.5 text-sm font-bold text-gray-400">건</span>
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              열람 권한
            </p>
            <p className="mt-1 text-lg font-extrabold text-emerald-600">무료 개방</p>
          </div>
        </div>

        {/* 최신 공고 미리보기 */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm md:rounded-3xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 md:px-5">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
              <HugeiconsIcon icon={Briefcase01Icon} size={16} color="currentColor" />
              최신 채용 공고
            </h3>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50"
            >
              더보기
              <HugeiconsIcon icon={ArrowRight01Icon} size={12} color="currentColor" />
            </Link>
          </div>

          {jobs.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm font-medium text-gray-400">
              아직 등록된 공고가 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-start justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50/50 md:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold leading-snug text-gray-900">
                      {job.title}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-400">
                      <span className="font-semibold text-gray-600">{job.company ?? "미디어사"}</span>
                      <span>·</span>
                      <span>마감 {job.deadline ?? "상시"}</span>
                      {job.published_at && (
                        <>
                          <span>·</span>
                          <span>{relativeTime(job.published_at)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {job.source_url && (
                    <a
                      href={job.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${job.title} 원문 공고 확인`}
                      className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-periwinkle-200 bg-white text-periwinkle-700 transition-colors hover:bg-periwinkle-600 hover:text-white"
                      title="원문 공고 확인"
                    >
                      <HugeiconsIcon icon={LinkSquare01Icon} size={14} color="currentColor" strokeWidth={2} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 하단: 등업 안내 (축소형) */}
        {isLoggedIn ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:rounded-3xl md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="min-w-0 text-sm font-extrabold text-gray-900">
                    🎓 수강생 전용 기능 안내
                  </h3>
                  <InfoHint align="left">
                    수강생 권한을 받으면 릴레이 스터디, 1:1 코칭 피드백, 고급 연습 원고실 등
                    전용 학습 기능을 이용할 수 있습니다. 아래에서 등업을 요청해 보세요.
                  </InfoHint>
                </div>
              </div>
              <GuestUpgradeRequestCard pendingRequest={data.pendingUpgradeRequest} />
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-periwinkle-100 bg-periwinkle-50/50 p-4 shadow-sm md:rounded-3xl md:p-6">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <h3 className="min-w-0 text-sm font-extrabold text-gray-900">
                    🎤 로그인하고 더 많은 기능을 이용하세요
                  </h3>
                  <InfoHint align="right">
                    무료 가입 후 등업을 요청하면 릴레이 스터디, 연습 원고실 등 수강생 전용 기능에 접근할 수 있습니다.
                  </InfoHint>
                </div>
              </div>
              <Link
                href="/login"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-periwinkle-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-periwinkle-700"
              >
                로그인 / 회원가입
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
