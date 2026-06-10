import { HugeiconsIcon } from "@hugeicons/react";
import { FileAudioIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/ui/cn";
import type { RelaySubmission } from "@/lib/studies/relay";
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

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-3 shadow-sm",
        hasOwnMark
          ? "border-periwinkle-200 bg-periwinkle-50/45 ring-1 ring-periwinkle-100"
          : "border-gray-200"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-periwinkle-700",
            hasOwnMark ? "bg-white" : "bg-periwinkle-50"
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
      ) : submission.audioUrl ? (
        <audio controls preload="none" src={submission.audioUrl} className="mt-3 w-full" />
      ) : (
        <div className="mt-3 rounded-2xl bg-gray-50 px-3 py-2 text-xs font-bold text-gray-400">
          재생 URL을 발급하지 못했습니다.
        </div>
      )}

      {submission.feedback && (
        <div
          className={cn(
            "mt-3 rounded-2xl px-3 py-2",
            isOwnFeedback ? "border border-periwinkle-100 bg-white" : "bg-gray-50",
            compact ? "" : "py-3"
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
