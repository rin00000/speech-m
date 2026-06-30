"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle01Icon, Comment01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserRole } from "@/lib/auth/session";
import type { StudyQuestDetail } from "@/lib/studies/data";
import { AudioFeedbackCard } from "./relay-study-audio-feedback-card";
import { EmptyPanel } from "./relay-study-detail-common";
import { FeedbackTextarea, UploadControl } from "./relay-study-submission-controls";

export function CompletedStackCard({
  quest,
  currentUserId,
}: {
  quest: StudyQuestDetail;
  currentUserId: string | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-4 md:pb-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} color="currentColor" />
          완료 스택
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        {quest.relay.completedSubmissions.length === 0 ? (
          <EmptyPanel text="아직 피드백 완료된 음성이 없습니다." />
        ) : (
          quest.relay.completedSubmissions.map((submission) => (
            <AudioFeedbackCard
              key={submission.id}
              submission={submission}
              currentUserId={currentUserId}
              compact
            />
          ))
        )}
      </CardBody>
    </Card>
  );
}

export function PendingRelayCard({
  quest,
  role,
  currentUserId,
  comment,
  file,
  isPending,
  onCommentChange,
  onFileChange,
  onFirstSubmit,
  onFeedbackAndUpload,
  onFinalFeedback,
}: {
  quest: StudyQuestDetail;
  role: UserRole;
  currentUserId: string | null;
  comment: string;
  file: File | null;
  isPending: boolean;
  onCommentChange: (value: string) => void;
  onFileChange: (value: File | null) => void;
  onFirstSubmit: () => void;
  onFeedbackAndUpload: () => void;
  onFinalFeedback: () => void;
}) {
  const pendingSubmission = quest.relay.pendingSubmission;
  const isStudent = role === "student" && Boolean(currentUserId);
  const isExpiredOpenQuest = quest.status === "open" && quest.isOverdue;

  return (
    <Card>
      <CardHeader className="pb-4 md:pb-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <HugeiconsIcon icon={Comment01Icon} size={18} color="currentColor" />
          현재 릴레이
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        {isExpiredOpenQuest ? (
          <>
            {pendingSubmission && (
              <AudioFeedbackCard submission={pendingSubmission} currentUserId={currentUserId} />
            )}
            <EmptyPanel text="마감이 지나 제출할 수 없습니다." />
          </>
        ) : !pendingSubmission ? (
          quest.relay.isComplete ? (
            <EmptyPanel text="이번 퀘스트 릴레이가 완료되었습니다." />
          ) : (
            <div className="space-y-4">
              <EmptyPanel text="첫 음성 제출을 기다리고 있습니다." />
              {quest.relay.canStart && (
                <UploadControl
                  file={file}
                  isPending={isPending}
                  buttonLabel="첫 음성 제출"
                  onFileChange={onFileChange}
                  onSubmit={onFirstSubmit}
                />
              )}
            </div>
          )
        ) : (
          <>
            <AudioFeedbackCard submission={pendingSubmission} currentUserId={currentUserId} />

            {quest.relay.canFeedbackAndUpload && (
              <div className="space-y-4">
                <FeedbackTextarea value={comment} onChange={onCommentChange} />
                <UploadControl
                  file={file}
                  isPending={isPending}
                  buttonLabel="피드백 남기고 새 음성 제출"
                  onFileChange={onFileChange}
                  onSubmit={onFeedbackAndUpload}
                />
              </div>
            )}

            {quest.relay.canFinalFeedback && (
              <div className="space-y-4">
                <FeedbackTextarea value={comment} onChange={onCommentChange} />
                <Button
                  type="button"
                  disabled={isPending || !comment.trim()}
                  onClick={onFinalFeedback}
                  className="w-full"
                >
                  마지막 피드백 제출
                </Button>
              </div>
            )}

            {isStudent && !quest.relay.canFeedbackAndUpload && !quest.relay.canFinalFeedback && (
              <EmptyPanel
                text={
                  pendingSubmission.studentUserId === currentUserId
                    ? "내 음성의 피드백을 기다리고 있습니다."
                    : quest.relay.userSubmission
                      ? "이번 퀘스트 제출을 완료했습니다."
                      : "아직 내 차례가 아닙니다."
                }
              />
            )}

            {role === "admin" && <EmptyPanel text="관리자는 릴레이 순서에 참여하지 않습니다." />}
          </>
        )}
      </CardBody>
    </Card>
  );
}

export function UnsubmittedMembersCard({ quest }: { quest: StudyQuestDetail }) {
  return (
    <Card className="xl:sticky xl:top-4">
      <CardHeader className="pb-4 md:pb-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <HugeiconsIcon icon={UserGroupIcon} size={18} color="currentColor" />
          미제출 명단
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        {quest.relay.unsubmittedMembers.length === 0 ? (
          <EmptyPanel text="모든 멤버가 음성을 제출했습니다." />
        ) : (
          quest.relay.unsubmittedMembers.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-gray-800">{member.displayName}</p>
                <p className="truncate text-[11px] font-medium text-gray-400">
                  {member.email ?? member.userId}
                </p>
              </div>
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}
