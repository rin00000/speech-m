import { AiPostPromptCopyButton } from "@/components/admin/jobs/ai-post-prompt-copy-button";
import { NaverShareIconLink } from "@/components/admin/jobs/naver-share-icon-link";
import { Header } from "@/components/admin/layout/header";
import { SOURCE_LABEL } from "@/lib/jobs/constants";
import { buildBlogContent, buildNaverShareUrl } from "@/lib/jobs/naver-share";
import { getPublicSiteOrigin } from "@/lib/jobs/site-url";
import { activeDeadlineOrExpression, isExpiredDeadline } from "@/lib/jobs/deadline";
import { relativeTime } from "@/lib/jobs/utils";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { HugeiconsIcon } from "@hugeicons/react";
import { LinkSquare01Icon } from "@hugeicons/core-free-icons";
import { RelayFeedbackConsole } from "@/components/admin/dashboard/relay-feedback-console";
import { CrawlerControlHub } from "@/components/admin/dashboard/crawler-control-hub";
import { getCurrentUser } from "@/lib/auth/session";
import Link from "next/link";

type JobPosting = Pick<
  Database["public"]["Tables"]["job_postings"]["Row"],
  "id" | "title" | "company" | "location" | "source" | "source_url" | "deadline" | "published_at"
>;

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <GuestDashboardView userName={null} email="" />;
  }

  if (user.role === "admin") {
    return <AdminDashboardView userName={user.name} />;
  } else if (user.role === "student") {
    return <StudentDashboardView userName={user.name} />;
  } else {
    return <GuestDashboardView userName={user.name} email={user.email} />;
  }
}

// 1. 관리자 전용 대시보드 뷰 (기존 구현)
async function AdminDashboardView({ userName }: { userName: string | null }) {
  const supabase = createAdminClient();
  const activeDeadline = activeDeadlineOrExpression();

  const recentPublishedJobsResult = await supabase
    .from("job_postings")
    .select("id,title,company,location,source,source_url,deadline,published_at")
    .eq("status", "approved")
    .not("published_at", "is", null)
    .or(activeDeadline)
    .order("published_at", { ascending: false })
    .limit(6)
    .returns<JobPosting[]>();

  const hasJobsError = Boolean(recentPublishedJobsResult.error);

  const recentPublishedJobs = (recentPublishedJobsResult.data ?? []).filter(
    (job) => !isExpiredDeadline(job.deadline),
  );
  const siteOrigin = getPublicSiteOrigin();

  return (
    <div className="flex flex-col">
      <Header
        title="대시보드"
        description="Speech-M 아카데미 현황을 한눈에 확인하세요."
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Top grid for 1:1 Relay Feedback Console & Crawler Control Hub */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
          <RelayFeedbackConsole />
          <CrawlerControlHub />
        </div>

        {/* Existing Job Postings Queue */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold leading-tight text-gray-800">
              최근 내부 게시 공고
            </h2>
            <p className="mt-1 text-xs leading-tight text-gray-500">
              승인 후 내부 게시가 확정된 최신 공고입니다.
            </p>
          </div>
          {hasJobsError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              공고 데이터를 불러오는 중 오류가 발생했습니다.
            </div>
          ) : recentPublishedJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 py-12 text-center">
              <p className="text-sm font-medium text-gray-500">
                내부 게시가 확정된 승인 공고가 없습니다.
              </p>
              <p className="mt-1 text-xs text-gray-400">
                공고 관리에서 승인 공고를 내부 게시하면 여기에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentPublishedJobs.map((job) => (
                <div key={job.id} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium leading-tight text-gray-800">
                        {job.title}
                      </p>
                      <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium leading-none text-gray-500">
                        {SOURCE_LABEL[job.source]}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                      <span>{job.company ?? "회사명 미상"}</span>
                      <span>마감 {job.deadline ?? "미정"}</span>
                      <span title={job.published_at ?? undefined}>
                        내부 게시 {job.published_at ? relativeTime(job.published_at) : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {siteOrigin ? (
                      <NaverShareIconLink
                        href={buildNaverShareUrl(
                          {
                            id: job.id,
                            title: job.title,
                            company: job.company,
                            location: job.location,
                            deadline: job.deadline,
                            source: job.source,
                            source_url: job.source_url,
                          },
                          siteOrigin,
                        )}
                        title={`네이버 공유하기\n\n${buildBlogContent({
                          title: job.title,
                          company: job.company,
                          location: job.location,
                          deadline: job.deadline,
                          source: job.source,
                          source_url: job.source_url,
                        })}`}
                        iconType="a"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md transition-opacity hover:bg-emerald-50 hover:opacity-90"
                      />
                    ) : null}
                    <AiPostPromptCopyButton jobId={job.id} />
                    {job.source_url ? (
                      <a
                        href={job.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-periwinkle-100 hover:text-periwinkle-700"
                        title="원문 보기"
                      >
                        <HugeiconsIcon icon={LinkSquare01Icon} size={16} color="currentColor" strokeWidth={1.6} />
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 2. 정회원 수강생용 전용 대시보드 뷰
function StudentDashboardView({ userName }: { userName: string | null }) {
  return (
    <div className="flex flex-col">
      <Header
        title="나의 학습 대시보드"
        description="Speech-M 명품 스피치 클래스에 오신 것을 환영합니다."
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Welcome Card with Periwinkle gradient */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-periwinkle-600 to-indigo-600 p-6 md:p-8 text-white shadow-md">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl animate-pulse" />
          <div className="relative z-10 space-y-2">
            <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
              🎙️ 안녕하세요, {userName ?? "준비생"} 수강생님!
            </h2>
            <p className="text-xs md:text-sm font-medium text-periwinkle-100 max-w-xl leading-relaxed">
              오늘도 마이크 앞에서 당신의 온전한 스피치 빛깔을 빛내어 보세요. 정성스럽게 선별된 훈련용 원고와 아카데미 강사진이 밀착 피드백을 전달할 준비를 마쳤습니다.
            </p>
            <div className="mt-4 pt-2">
              <Link
                href="/practice"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-periwinkle-700 transition-transform active:scale-95 hover:bg-periwinkle-50"
              >
                <span>오늘의 연습 원고 매치하기</span>
                <span className="text-lg">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Practice Progress Card */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-gray-800 flex items-center gap-1.5">
                <span className="text-lg">📖</span>
                <span>정회원 추천 학습 훈련</span>
              </h3>
              <p className="mt-1 text-xs text-gray-400 font-medium">원장님이 엄선한 핵심 딕션 및 시황 리포트 훈련 코스입니다.</p>
              
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <span className="text-xs font-bold text-gray-700">KBS 정오 뉴스 - 수도권 집중호우</span>
                  <span className="text-[10px] font-extrabold text-periwinkle-600 bg-periwinkle-50 px-2 py-0.5 rounded">난이도 보통</span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <span className="text-xs font-bold text-gray-700">YTN 경제 브리핑 - 미 금리 인하</span>
                  <span className="text-[10px] font-extrabold text-red-500 bg-red-50 px-2 py-0.5 rounded">난이도 어려움</span>
                </div>
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-bold text-gray-700">MBC 기상정보 - 때 이른 초여름</span>
                  <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">난이도 쉬움</span>
                </div>
              </div>
            </div>

            <Link
              href="/practice"
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gray-50 py-2.5 text-xs font-extrabold text-gray-600 hover:bg-gray-100"
            >
              연습 원고실로 입장
            </Link>
          </div>

          {/* Feedback Card */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-gray-800 flex items-center gap-1.5">
                <span className="text-lg">💬</span>
                <span>나의 1:1 릴레이 피드백</span>
              </h3>
              <p className="mt-1 text-xs text-gray-400 font-medium">강사진이 분석한 나의 강점과 극복 과제가 도착하는 알림장입니다.</p>

              <div className="mt-6 flex flex-col items-center justify-center py-4 text-center border border-dashed border-gray-150 rounded-2xl bg-gray-50/50">
                <span className="text-xl">✨</span>
                <p className="mt-2 text-xs font-bold text-gray-600">피드백이 안전하게 준비 중입니다</p>
                <p className="mt-0.5 text-[10px] text-gray-400">스터디 녹음본을 제출하시면 강사진의 코칭이 이곳에 도착합니다.</p>
              </div>
            </div>

            <Link
              href="/studies"
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gray-50 py-2.5 text-xs font-extrabold text-gray-600 hover:bg-gray-100"
            >
              내 스터디 현황 확인
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// 3. 게스트 / 대기 승인용 대시보드 뷰
function GuestDashboardView({ userName, email }: { userName: string | null; email: string }) {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-periwinkle-50/20">
      <Header
        title="Speech-M 멤버십 센터"
        description="Speech-M의 특별한 회원 권한 상태를 확인하실 수 있는 라운지입니다."
      />

      <div className="flex-grow flex items-center justify-center p-6">
        <div className="max-w-2xl w-full rounded-3xl border border-gray-100 bg-white p-8 md:p-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden">
          {/* Decorative gradients */}
          <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-periwinkle-100/50 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 h-52 w-52 rounded-full bg-pink-100/30 blur-3xl" />

          <div className="relative z-10">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 border border-amber-100 mb-6 shadow-sm">
              ✨
            </span>

            <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight leading-tight">
              {userName ?? "준비생"}님, 가입을 환영합니다!
            </h2>
            <p className="mt-3 text-xs md:text-sm font-semibold text-amber-600 bg-amber-50/70 inline-block px-3.5 py-1 rounded-full border border-amber-100/50">
              ⚡ 현재 &apos;수강생 정회원 권한&apos; 신청 대기 상태입니다.
            </p>

            <p className="mt-5 text-xs md:text-sm font-medium text-gray-500 leading-relaxed max-w-lg mx-auto">
              현재 계정({email || "비로그인"})은 **일반 게스트(불특정 다수)** 역할입니다. 아카데미 정회원 등록 절차가 끝나면 원장님이 즉시 **수강생(student)** 권한으로 승격해 드리며, 수강생용 전용 혜택이 모두 활성화됩니다!
            </p>

            {/* Benefits cards grid */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left border-t border-gray-150 pt-8">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1">
                  <span>🎙️</span>
                  <span>최고급 방송 연습 원고실</span>
                </h4>
                <p className="mt-1 text-[11px] text-gray-500 leading-normal font-medium">
                  실제 뉴스 속보, 기상캐스터, 라디오 오프닝, 증시 시황을 비롯한 고난도 딕션 훈련 대본에 제한 없이 접근합니다.
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1">
                  <span>🎯</span>
                  <span>1:1 릴레이 밀착 코칭</span>
                </h4>
                <p className="mt-1 text-[11px] text-gray-500 leading-normal font-medium">
                  나의 음성과 발성에 대한 보완 과제를 밀착 지도해 주는 담임제 피드백을 실시간으로 확인하고 학습할 수 있습니다.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link
                href="/jobs"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-2xl bg-periwinkle-600 px-6 py-3.5 text-xs font-extrabold text-white shadow-md transition-all active:scale-[0.98] hover:bg-periwinkle-700"
              >
                <span>Curated 채용 공고 보러가기</span>
                <span>→</span>
              </Link>
              <a
                href="https://open.kakao.com" // 예시용
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-2xl bg-gray-100 border border-gray-200 px-6 py-3.5 text-xs font-bold text-gray-600 transition-all hover:bg-gray-200"
              >
                원장님께 정회원 등업 문의
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
