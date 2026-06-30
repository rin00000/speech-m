/**
 * 정회원 수강생 전용 대시보드 화면.
 * 참여 스터디, 오늘 할 일, 릴레이 피드백, 연습 원고 진입을 한곳에 모은다.
 */

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Comment01Icon,
  FileEditIcon,
  Task01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { Header } from "@/components/admin/layout/header";
import { ManagementClassNoticesPanel } from "@/components/admin/dashboard/management-class-notices-panel";
import { StudyApplicationCard } from "@/components/admin/studies/study-application-card";
import { PullToRefreshContainer } from "@/components/ui/pull-to-refresh-container";
import type {
  StudentDashboardData,
  StudentDashboardDueState,
  StudentDashboardFeedback,
  StudentDashboardTask,
  StudentPracticeHighlight,
} from "@/lib/studies/student-dashboard";
import type { PracticeScriptCategory, PracticeScriptDifficulty } from "@/types/database.types";

type StudentDashboardViewProps = {
  userName: string | null;
  data: StudentDashboardData;
};

const dueStateLabels: Record<StudentDashboardDueState, string> = {
  steady: "진행 중",
  due_soon: "마감 임박",
  overdue: "마감 지남",
};

const dueStateClassNames: Record<StudentDashboardDueState, string> = {
  steady: "border-periwinkle-100 bg-periwinkle-50 text-periwinkle-700",
  due_soon: "border-amber-100 bg-amber-50 text-amber-700",
  overdue: "border-red-100 bg-red-50 text-red-700",
};

const difficultyClassNames: Record<PracticeScriptDifficulty, string> = {
  쉬움: "border-emerald-100 bg-emerald-50 text-emerald-700",
  보통: "border-periwinkle-100 bg-periwinkle-50 text-periwinkle-700",
  어려움: "border-red-100 bg-red-50 text-red-700",
};

const categoryLabels: Record<PracticeScriptCategory, string> = {
  practice: "연습",
  portfolio: "포트폴리오",
  designated: "지정",
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function StudentDashboardView({ userName, data }: StudentDashboardViewProps) {
  const hasNoStudies = data.studyCount === 0;
  const firstTask = data.tasks[0] ?? null;
  const primaryStudyHref = hasNoStudies
    ? "/studies"
    : firstTask
      ? `/studies/${firstTask.studyId}`
      : data.nextStudyId
        ? `/studies/${data.nextStudyId}`
        : "/studies";

  return (
    <div className="flex h-dvh min-h-0 flex-1 flex-col overflow-hidden md:h-full">
      <Header
        title="나의 학습 대시보드"
        description="오늘 해야 할 스터디 흐름과 연습 진입점을 확인합니다."
      />

      <PullToRefreshContainer className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:space-y-6 md:p-6 md:pb-6">
        <ManagementClassNoticesPanel notices={data.managementClassNotices} />

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:rounded-3xl md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-periwinkle-600">
                정회원 학습 현황
              </p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-gray-900 md:text-2xl">
                안녕하세요, {userName ?? "준비생"} 수강생님
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-snug text-gray-500">
                {hasNoStudies
                  ? "현재 참여 중인 릴레이 스터디가 없습니다. 아래 안내를 확인하여 스터디 참여 신청을 진행하시거나 추천 학습 훈련으로 연습을 시작해 보세요."
                  : "오늘은 스터디 제출 흐름과 연습 원고를 먼저 확인하면 됩니다. 참여 중인 릴레이가 있으면 내 차례만 이곳에 표시됩니다."}
              </p>
            </div>

            <Link
              href={primaryStudyHref}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-periwinkle-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-periwinkle-700"
            >
              {hasNoStudies ? "스터디 둘러보기" : firstTask ? "오늘 할 일 시작" : "내 스터디 보기"}
              <HugeiconsIcon icon={ArrowRight01Icon} size={15} color="currentColor" />
            </Link>
          </div>
        </section>

        {hasNoStudies ? (
          <div className="space-y-4 md:space-y-6">
            <StudyPromotionCard application={data.studyApplication} />
            <PracticeHighlightsPanel highlights={data.practiceHighlights} />
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:gap-6">
              <StudyStatusPanel data={data} />
              <TodayStudentTasksPanel tasks={data.tasks} taskCount={data.taskCount} />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6">
              <RecentRelayFeedbackPanel feedback={data.recentFeedback} />
              <PracticeHighlightsPanel highlights={data.practiceHighlights} />
            </div>
          </>
        )}
      </PullToRefreshContainer>
    </div>
  );
}

function StudyStatusPanel({ data }: { data: StudentDashboardData }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
      <SectionHeader
        icon={UserGroupIcon}
        title="내 스터디 현황"
        description="참여 중인 릴레이 스터디와 다음 마감을 확인합니다."
      />

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Metric label="참여" value={`${data.studyCount}`} />
        <Metric label="열린 퀘스트" value={`${data.openQuestCount}`} />
        <Metric label="다음 마감" value={data.nextDueAt ? formatShortDate(data.nextDueAt) : "-"} />
      </div>

      {data.studies.length === 0 ? (
        <EmptyPanel
          title="참여 중인 스터디가 없습니다"
          description="관리자가 스터디 멤버로 추가하면 이곳에 표시됩니다."
        />
      ) : (
        <div className="mt-4 space-y-2">
          {data.studies.slice(0, 3).map((study) => (
            <Link
              key={study.id}
              href={`/studies/${study.id}`}
              className="block rounded-2xl border border-gray-100 bg-gray-50/70 px-3 py-3 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-gray-900">{study.title}</p>
                  <p className="mt-1 truncate text-xs font-medium text-gray-500">
                    멤버 {study.memberCount}명 · 열린 퀘스트 {study.openQuestCount}개
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-bold leading-none text-gray-500">
                  {study.nextDueAt ? `${formatShortDate(study.nextDueAt)} 마감` : "대기"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function TodayStudentTasksPanel({
  tasks,
  taskCount,
}: {
  tasks: StudentDashboardTask[];
  taskCount: number;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
      <div className="flex items-start justify-between gap-3">
        <SectionHeader
          icon={Task01Icon}
          title="오늘 나의 할 일"
          description="내가 바로 움직여야 하는 릴레이 작업만 표시합니다."
        />
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-extrabold leading-none ${
            taskCount > 0
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {taskCount > 0 ? `${taskCount}건` : "정상"}
        </span>
      </div>

      {tasks.length === 0 ? (
        <EmptyPanel
          title="지금 처리할 릴레이 작업이 없습니다"
          description="내 제출 차례가 오면 이곳에 표시됩니다."
        />
      ) : (
        <div className="mt-4 space-y-2">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/studies/${task.studyId}`}
              className="block rounded-2xl border border-gray-100 bg-gray-50/70 px-3 py-3 hover:bg-gray-50"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold leading-none ${dueStateClassNames[task.dueState]}`}
                    >
                      {dueStateLabels[task.dueState]}
                    </span>
                    <span className="truncate text-[11px] font-bold text-periwinkle-600">
                      {task.studyTitle}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-extrabold leading-tight text-gray-900">
                    {task.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-gray-500">
                    {task.description}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-bold leading-none text-gray-500">
                  {formatDueAt(task.dueAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function RecentRelayFeedbackPanel({ feedback }: { feedback: StudentDashboardFeedback[] }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
      <SectionHeader
        icon={Comment01Icon}
        title="최근 받은 피드백"
        description="내 음성에 도착한 릴레이 피드백만 확인합니다."
      />

      {feedback.length === 0 ? (
        <EmptyPanel
          title="아직 받은 피드백이 없습니다"
          description="내 음성에 릴레이 피드백이 달리면 이곳에 표시됩니다."
        />
      ) : (
        <div className="mt-4 space-y-2">
          {feedback.map((item) => (
            <Link
              key={item.id}
              href={`/studies/${item.studyId}`}
              className="block rounded-2xl border border-gray-100 bg-gray-50/70 px-3 py-3 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-periwinkle-100 bg-periwinkle-50 px-2 py-0.5 text-[10px] font-bold leading-none text-periwinkle-700">
                      받은 피드백
                    </span>
                    <span className="truncate text-[11px] font-bold text-gray-400">
                      {item.questTitle}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug text-gray-700">
                    {item.comment}
                  </p>
                  <p className="mt-2 text-[11px] font-semibold text-gray-400">
                    {item.authorName}님이 남김 · {formatShortDate(item.createdAt)}
                  </p>
                </div>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={14}
                  color="currentColor"
                  className="mt-1 shrink-0 text-gray-300"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function PracticeHighlightsPanel({ highlights }: { highlights: StudentPracticeHighlight[] }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
      <div className="flex items-start justify-between gap-3">
        <SectionHeader
          icon={FileEditIcon}
          title="추천 학습 훈련"
          description="최근 등록된 연습 원고를 바로 확인합니다."
        />
        <Link
          href="/practice"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-bold leading-none text-gray-700 hover:bg-gray-50"
        >
          연습실
          <HugeiconsIcon icon={ArrowRight01Icon} size={13} color="currentColor" />
        </Link>
      </div>

      {highlights.length === 0 ? (
        <EmptyPanel
          title="등록된 연습 원고가 없습니다"
          description="연습 원고실에 원고가 추가되면 이곳에 표시됩니다."
        />
      ) : (
        <div className="mt-4 space-y-2">
          {highlights.map((script) => (
            <Link
              key={script.id}
              href="/practice"
              className="block rounded-2xl border border-gray-100 bg-gray-50/70 px-3 py-3 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-gray-900">{script.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-gray-500">
                    {script.description || script.type}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-bold leading-none text-gray-500">
                    {categoryLabels[script.category]}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold leading-none ${difficultyClassNames[script.difficulty]}`}
                  >
                    {script.difficulty}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function StudyPromotionCard({
  application,
}: {
  application: StudentDashboardData["studyApplication"];
}) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm md:p-8">
      <div className="max-w-3xl">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-periwinkle-100 bg-periwinkle-50 text-periwinkle-700">
            <HugeiconsIcon icon={UserGroupIcon} size={20} color="currentColor" strokeWidth={1.8} />
          </span>
          <h3 className="text-base font-extrabold tracking-tight text-gray-900 md:text-lg">
            🎙️ 릴레이 스터디로 실전 감각을 키워보세요!
          </h3>
        </div>
        
        <p className="mt-4 text-sm font-medium leading-snug text-gray-500">
          Speech-M의 릴레이 스터디는 동료 수강생들과 매일 뉴스를 낭독하고 피드백을 주고받으며, 
          리포터·아나운서 시험을 더 완벽하게 준비할 수 있는 정회원 전용 학습 훈련 공간입니다.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-periwinkle-100 bg-white text-periwinkle-600">
              <HugeiconsIcon icon={Comment01Icon} size={14} color="currentColor" />
            </div>
            <h4 className="mt-3 text-sm font-extrabold text-gray-900">상호 릴레이 피드백</h4>
            <p className="mt-1 text-xs font-medium leading-normal text-gray-500">
              앞 사람의 음성을 듣고 피드백을 남긴 뒤 내 녹음을 제출하는 상호 학습 방식입니다.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-periwinkle-100 bg-white text-periwinkle-600">
              <HugeiconsIcon icon={Task01Icon} size={14} color="currentColor" />
            </div>
            <h4 className="mt-3 text-sm font-extrabold text-gray-900">실전 미션 원고</h4>
            <p className="mt-1 text-xs font-medium leading-normal text-gray-500">
              매주 새롭게 부여되는 엄선된 뉴스/방송 원고를 통해 실전형 훈련이 가능합니다.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-periwinkle-100 bg-white text-periwinkle-600">
              <HugeiconsIcon icon={FileEditIcon} size={14} color="currentColor" />
            </div>
            <h4 className="mt-3 text-sm font-extrabold text-gray-900">학습 성장 아카이빙</h4>
            <p className="mt-1 text-xs font-medium leading-normal text-gray-500">
              제출 기록과 동료들의 피드백이 누적되어 나의 낭독 변화와 성장을 확인할 수 있습니다.
            </p>
          </div>
        </div>

        <StudyApplicationCard application={application} className="mt-6" />
      </div>
    </section>
  );
}


function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: typeof UserGroupIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-periwinkle-100 bg-periwinkle-50 text-periwinkle-700">
        <HugeiconsIcon icon={icon} size={16} color="currentColor" strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-extrabold leading-tight text-gray-900">{title}</h3>
        <p className="mt-1 text-xs font-medium leading-snug text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 px-2 py-3">
      <p className="text-base font-extrabold leading-none text-gray-900">{value}</p>
      <p className="mt-1 text-[10px] font-bold leading-none text-gray-400">{label}</p>
    </div>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
      <p className="text-sm font-extrabold text-gray-700">{title}</p>
      <p className="mt-1 text-xs font-medium leading-snug text-gray-400">{description}</p>
    </div>
  );
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "미정";
  return dateFormatter.format(date);
}

function formatDueAt(value: string) {
  const formatted = formatShortDate(value);
  return formatted === "미정" ? formatted : `${formatted} 마감`;
}
