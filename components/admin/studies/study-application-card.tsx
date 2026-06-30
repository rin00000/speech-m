"use client";

/**
 * 수강생이 릴레이 스터디 참여 신청을 보내고 현재 처리 상태를 확인하는 카드입니다.
 * 대시보드와 /studies 빈 상태에서 같은 Server Action 흐름을 공유합니다.
 */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  CheckmarkCircle01Icon,
  MailSend01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { submitStudyApplication } from "@/app/(admin)/studies/actions";
import { Button } from "@/components/ui/button";
import type { StudentStudyApplication } from "@/lib/studies/applications";

type StudyApplicationCardProps = {
  application: StudentStudyApplication;
  className?: string;
};

export function StudyApplicationCard({
  application,
  className = "",
}: StudyApplicationCardProps) {
  const router = useRouter();
  const [message, setMessage] = useState(application?.status === "pending" ? application.message : "");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMessage(application?.status === "pending" ? application.message : "");
      setSubmittedAt(null);
      setStatusMessage(null);
      setErrorMessage(null);
    });

    return () => cancelAnimationFrame(frame);
  }, [application?.id, application?.message, application?.status]);

  const isWaiting = Boolean(submittedAt) || application?.status === "pending";
  const isApproved = application?.status === "approved";
  const isRejected = application?.status === "rejected";

  const handleSubmit = () => {
    setStatusMessage(null);
    setErrorMessage(null);

    startTransition(async () => {
      const result = await submitStudyApplication(message);
      if (!result.success) {
        setErrorMessage(result.error ?? "스터디 신청을 보내지 못했습니다.");
        return;
      }

      setSubmittedAt(result.data.requestedAt);
      setStatusMessage("스터디 신청이 관리자 화면에 전달되었습니다.");
      router.refresh();
    });
  };

  return (
    <section
      className={`rounded-2xl border border-periwinkle-100 bg-periwinkle-50/50 p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-periwinkle-100 bg-white text-periwinkle-700">
          <HugeiconsIcon icon={UserGroupIcon} size={16} color="currentColor" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-extrabold text-gray-900">릴레이 스터디 참여 신청</h4>
            <ApplicationStatusBadge
              isApproved={isApproved}
              isRejected={isRejected}
              isWaiting={isWaiting}
            />
          </div>
          <p className="mt-1 text-xs font-medium leading-snug text-gray-500">
            참여를 원하면 간단한 메모를 남겨주세요. 관리자가 확인 후 스터디 그룹에 배정합니다.
          </p>
        </div>
      </div>

      {application && (
        <div className="mt-3 rounded-2xl border border-gray-100 bg-white px-3 py-2 text-xs font-semibold leading-snug text-gray-600">
          {getApplicationStatusText(application, submittedAt)}
        </div>
      )}

      {isApproved ? null : (
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-gray-500">신청 메모</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="희망하는 참여 목표나 참고할 내용을 적어주세요."
              className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium leading-snug text-gray-800 outline-none placeholder:text-gray-400 focus:border-periwinkle-300"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[11px] font-semibold text-gray-400">
              {message.length}/500
            </span>
            <Button type="button" disabled={isPending} onClick={handleSubmit} className="w-full sm:w-auto">
              <HugeiconsIcon icon={MailSend01Icon} size={14} color="currentColor" />
              {getSubmitButtonLabel({ isPending, isWaiting, isRejected })}
            </Button>
          </div>
        </div>
      )}

      {statusMessage && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} color="currentColor" />
          {statusMessage}
        </p>
      )}
      {errorMessage && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-red-700">
          <HugeiconsIcon icon={Cancel01Icon} size={14} color="currentColor" />
          {errorMessage}
        </p>
      )}
    </section>
  );
}

function ApplicationStatusBadge({
  isApproved,
  isRejected,
  isWaiting,
}: {
  isApproved: boolean;
  isRejected: boolean;
  isWaiting: boolean;
}) {
  const className = isApproved
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : isRejected
      ? "border-red-200 bg-red-50 text-red-700"
      : isWaiting
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-gray-200 bg-white text-gray-500";
  const label = isApproved ? "승인 완료" : isRejected ? "다시 신청 가능" : isWaiting ? "승인 대기" : "미신청";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold leading-none ${className}`}>
      {label}
    </span>
  );
}

function getApplicationStatusText(
  application: NonNullable<StudentStudyApplication>,
  submittedAt: string | null
) {
  if (submittedAt || application.status === "pending") {
    return `최근 신청: ${formatDateTime(submittedAt ?? application.requestedAt)} · 관리자가 검토 중입니다.`;
  }
  if (application.status === "approved") {
    return `${application.groupTitle ?? "릴레이 스터디"} 멤버로 배정되었습니다. 내 스터디에서 확인해 주세요.`;
  }
  return `지난 신청은 ${formatDateTime(application.resolvedAt ?? application.requestedAt)}에 처리되었습니다. 필요하면 다시 신청할 수 있습니다.`;
}

function getSubmitButtonLabel({
  isPending,
  isWaiting,
  isRejected,
}: {
  isPending: boolean;
  isWaiting: boolean;
  isRejected: boolean;
}) {
  if (isPending) return "신청 전송 중";
  if (isWaiting) return "신청 메모 갱신";
  if (isRejected) return "다시 신청";
  return "스터디 신청";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "미정";
  return date.toLocaleString("ko-KR");
}
