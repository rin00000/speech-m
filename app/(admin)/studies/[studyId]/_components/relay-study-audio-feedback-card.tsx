"use client";

import { useState, useTransition } from "react";
import { FileAudioIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import type { RelaySubmission } from "@/lib/studies/relay";
import { cn } from "@/lib/ui/cn";
import { getRelaySubmissionAudioUrl } from "../../actions";
import { formatDateTime } from "./relay-study-detail-common";

export function AudioFeedbackCard({
  submission,
  currentUserId,
  compact = false,
}: {
  submission: RelaySubmission;
  currentUserId: string | null;
  compact?: boolean;
}) {
  const isOwnAudio = submission.studentUserId === currentUserId;
  const isOwnFeedback = submission.feedback?.authorUserId === currentUserId;
  const hasOwnMark = isOwnAudio || isOwnFeedback;
  const [audioUrl, setAudioUrl] = useState(submission.audioUrl);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isAudioPending, startAudioTransition] = useTransition();

  const handleLoadAudio = () => {
    if (audioUrl || isAudioPending) return;

    setAudioError(null);
    startAudioTransition(async () => {
      const result = await getRelaySubmissionAudioUrl(submission.id);
      if (!result.success) {
        setAudioError(result.error);
        return;
      }
      setAudioUrl(result.data.audioUrl);
    });
  };

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-3 shadow-sm",
        hasOwnMark
          ? "border-periwinkle-200 bg-periwinkle-50/45 ring-1 ring-periwinkle-100"
          : "border-gray-200",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-periwinkle-700",
            hasOwnMark ? "bg-white" : "bg-periwinkle-50",
          )}
        >
          <HugeiconsIcon icon={FileAudioIcon} size={17} color="currentColor" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-extrabold text-gray-900">
              {submission.sequenceNumber}. {submission.studentName}
            </p>
            {isOwnAudio && <OwnBadge label="내 음성" />}
            {isOwnFeedback && <OwnBadge label="내 피드백" />}
            <span className="text-[11px] font-bold text-gray-400">
              {formatDateTime(submission.submittedAt)}
            </span>
          </div>
          <p className="mt-1 truncate text-xs font-medium text-gray-400">
            {submission.audioFileName}
          </p>
        </div>
      </div>

      {submission.audioDeletedAt ? (
        <div className="mt-3 rounded-2xl bg-gray-50 px-3 py-2 text-xs font-bold text-gray-400">
          보관 기간이 지나 음성 파일이 삭제되었습니다.
        </div>
      ) : audioUrl ? (
        <audio controls preload="none" src={audioUrl} className="mt-3 w-full" />
      ) : (
        <div className="mt-3 space-y-2 rounded-2xl bg-gray-50 px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isAudioPending}
            onClick={handleLoadAudio}
            className="w-full"
          >
            <HugeiconsIcon icon={FileAudioIcon} size={14} color="currentColor" />
            {isAudioPending ? "오디오 불러오는 중" : "오디오 불러오기"}
          </Button>
          {audioError && (
            <p className="text-xs font-bold leading-snug text-red-600">{audioError}</p>
          )}
        </div>
      )}

      {submission.feedback && (
        <div
          className={cn(
            "mt-3 rounded-2xl px-3 py-2",
            isOwnFeedback ? "border border-periwinkle-100 bg-white" : "bg-gray-50",
            compact ? "" : "py-3",
          )}
        >
          {isOwnFeedback && (
            <p className="mb-1 text-[11px] font-extrabold text-periwinkle-700">
              내가 남긴 피드백
            </p>
          )}
          <p className="line-clamp-2 text-xs font-semibold leading-snug text-gray-700">
            {submission.feedback.comment}
          </p>
          <p className="mt-1 text-[11px] font-bold text-gray-400">
            {submission.feedback.authorName}
          </p>
        </div>
      )}
    </div>
  );
}

function OwnBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-periwinkle-200 bg-white px-2 py-1 text-[11px] font-extrabold leading-none text-periwinkle-700">
      {label}
    </span>
  );
}
