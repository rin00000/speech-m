/**
 * 관리자 대시보드의 스터디 진행 현황 패널.
 * 릴레이 피드백 입력이 아니라 열린 퀘스트의 제출·피드백 흐름을 읽기 전용으로 보여준다.
 */

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Activity01Icon,
  AlertCircleIcon,
  ArrowRight01Icon,
  Calendar01Icon,
  CheckmarkCircle01Icon,
  DashboardSquare01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AdminStudyDueState,
  AdminStudyProgress,
  AdminStudyQuestProgressItem,
} from "@/lib/studies/admin-progress";

type StudyProgressDashboardProps = {
  progress: AdminStudyProgress;
  hasError: boolean;
};

const dueStateLabels: Record<AdminStudyDueState, string> = {
  steady: "순항",
  due_soon: "마감 임박",
  overdue: "마감 지남",
};

const dueStateClassNames: Record<AdminStudyDueState, string> = {
  steady: "border-emerald-100 bg-emerald-50 text-emerald-700",
  due_soon: "border-amber-100 bg-amber-50 text-amber-700",
  overdue: "border-red-100 bg-red-50 text-red-700",
};

const dueFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function StudyProgressDashboard({
  progress,
  hasError,
}: StudyProgressDashboardProps) {
  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="bg-gray-50/45 pb-3 md:pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-periwinkle-700 shadow-sm ring-1 ring-periwinkle-100">
              <HugeiconsIcon
                icon={DashboardSquare01Icon}
                size={15}
                color="currentColor"
                strokeWidth={2}
              />
            </span>
            <div>
              <CardTitle className="text-sm font-extrabold text-gray-800 tracking-normal">
                스터디 진행 대시보드
              </CardTitle>
              <CardDescription className="text-xs text-gray-400">
                열린 릴레이 퀘스트의 제출률과 피드백 흐름을 확인합니다
              </CardDescription>
            </div>
          </div>

          <Link
            href="/studies"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-bold leading-none text-gray-700 hover:bg-gray-50"
          >
            스터디 관리
            <HugeiconsIcon icon={ArrowRight01Icon} size={13} color="currentColor" />
          </Link>
        </div>
      </CardHeader>

      <CardBody className="space-y-4 pt-4">
        {hasError ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <HugeiconsIcon
              icon={AlertCircleIcon}
              size={17}
              color="currentColor"
              strokeWidth={1.8}
              className="mt-0.5 shrink-0"
            />
            <span>스터디 진행 데이터를 불러오는 중 오류가 발생했습니다.</span>
          </div>
        ) : progress.activeStudyCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
            <p className="text-sm font-extrabold text-gray-700">운영 중인 스터디가 없습니다</p>
            <p className="mt-1 text-xs font-medium text-gray-400">
              새 스터디를 만들면 참여율과 열린 퀘스트가 이곳에 표시됩니다.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryMetric
                icon={UserGroupIcon}
                label="운영 스터디"
                value={`${progress.activeStudyCount}`}
                description={`참여 수강생 ${progress.activeMemberCount}명`}
              />
              <SummaryMetric
                icon={Calendar01Icon}
                label="열린 퀘스트"
                value={`${progress.openQuestCount}`}
                description={
                  progress.attentionQuestCount > 0
                    ? `주의 ${progress.attentionQuestCount}개`
                    : "병목 없음"
                }
              />
              <SummaryMetric
                icon={Activity01Icon}
                label="제출률"
                value={`${progress.submissionRate}%`}
                description="열린 퀘스트 기준"
              />
              <SummaryMetric
                icon={CheckmarkCircle01Icon}
                label="피드백 완료율"
                value={`${progress.feedbackRate}%`}
                description="제출된 음성 기준"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <ProgressGauge label="전체 제출률" value={progress.submissionRate} />
              <ProgressGauge label="피드백 완료율" value={progress.feedbackRate} tone="emerald" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-[11px] font-bold uppercase text-gray-400">
                  열린 퀘스트 점검
                </h4>
                {progress.attentionQuestCount > 0 ? (
                  <span className="rounded-full border border-amber-100 bg-amber-50 px-2 py-1 text-[10px] font-bold leading-none text-amber-700">
                    확인 필요 {progress.attentionQuestCount}
                  </span>
                ) : null}
              </div>

              {progress.upcomingQuests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-xs font-bold text-gray-400">
                  현재 열린 퀘스트가 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {progress.upcomingQuests.map((quest) => (
                    <QuestProgressRow key={quest.id} quest={quest} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function SummaryMetric({
  icon,
  label,
  value,
  description,
}: {
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-gray-400">{label}</span>
        <HugeiconsIcon icon={icon} size={14} color="currentColor" className="text-gray-400" />
      </div>
      <p className="mt-2 text-xl font-extrabold leading-none text-gray-900">{value}</p>
      <p className="mt-1 text-[10px] font-semibold leading-tight text-gray-400">{description}</p>
    </div>
  );
}

function ProgressGauge({
  label,
  value,
  tone = "periwinkle",
}: {
  label: string;
  value: number;
  tone?: "periwinkle" | "emerald";
}) {
  const fillClassName = tone === "emerald" ? "bg-emerald-500" : "bg-periwinkle-600";

  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-gray-500">{label}</span>
        <span className="text-[11px] font-extrabold text-gray-800">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${fillClassName}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function QuestProgressRow({ quest }: { quest: AdminStudyQuestProgressItem }) {
  return (
    <Link
      href={`/studies/${quest.studyId}`}
      className="block rounded-2xl border border-gray-100 bg-white px-3 py-3 hover:bg-gray-50"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold leading-none ${dueStateClassNames[quest.dueState]}`}
            >
              {dueStateLabels[quest.dueState]}
            </span>
            <span className="truncate text-[11px] font-bold text-periwinkle-600">
              {quest.studyTitle}
            </span>
          </div>
          <p className="mt-1 truncate text-sm font-extrabold text-gray-900">
            {quest.questTitle}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-gray-400">
            마감 {formatDueAt(quest.dueAt)}
          </p>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-36">
          <MiniMetric
            label="제출"
            value={`${quest.submissionCount}/${quest.memberCount}`}
            rate={quest.submissionRate}
          />
          <MiniMetric
            label="피드백"
            value={`${quest.feedbackCount}/${quest.submissionCount}`}
            rate={quest.feedbackRate}
          />
        </div>
      </div>
    </Link>
  );
}

function MiniMetric({
  label,
  value,
  rate,
}: {
  label: string;
  value: string;
  rate: number;
}) {
  return (
    <div className="rounded-2xl bg-gray-50 px-2 py-2 text-center">
      <p className="text-[9px] font-bold leading-none text-gray-400">{label}</p>
      <p className="mt-1 text-xs font-extrabold leading-none text-gray-800">{value}</p>
      <p className="mt-1 text-[9px] font-bold leading-none text-gray-400">{rate}%</p>
    </div>
  );
}

function formatDueAt(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "미정";
  return dueFormatter.format(date);
}
