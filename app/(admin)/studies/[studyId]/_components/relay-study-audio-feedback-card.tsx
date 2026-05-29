/**
 * 릴레이 제출 음성 카드.
 * 제출자/파일명/오디오 플레이어와 해당 제출에 달린 피드백 요약을 표시한다.
 */

import { HugeiconsIcon } from "@hugeicons/react";
import { FileAudioIcon } from "@hugeicons/core-free-icons";
import type { RelaySubmission } from "@/lib/studies/relay";
import { formatDateTime } from "./relay-study-detail-common";

export function AudioFeedbackCard({
  submission,
  compact = false,
}: {
  submission: RelaySubmission;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-periwinkle-50 text-periwinkle-700">
          <HugeiconsIcon icon={FileAudioIcon} size={17} color="currentColor" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-extrabold text-gray-900">
              {submission.sequenceNumber}. {submission.studentName}
            </p>
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
      ) : submission.audioUrl ? (
        <audio controls preload="none" src={submission.audioUrl} className="mt-3 w-full" />
      ) : (
        <div className="mt-3 rounded-2xl bg-gray-50 px-3 py-2 text-xs font-bold text-gray-400">
          재생 URL을 발급하지 못했습니다.
        </div>
      )}

      {submission.feedback && (
        <div className={`mt-3 rounded-2xl bg-gray-50 px-3 py-2 ${compact ? "" : "py-3"}`}>
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
