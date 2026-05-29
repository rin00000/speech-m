"use client";

/**
 * 릴레이 스터디 상세 화면.
 * 퀘스트별 완료 스택, 현재 피드백 대기 음성, 미참여자 목록을 3카드 레이아웃으로 표시한다.
 */

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BookOpen01Icon,
  Calendar01Icon,
  CheckmarkCircle01Icon,
  CloudUploadIcon,
  Comment01Icon,
  FileAudioIcon,
  RefreshIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { STUDY_AUDIO_BUCKET } from "@/lib/studies/constants";
import type { StudyDetail, StudyQuestDetail } from "@/lib/studies/data";
import type { RelaySubmission } from "@/lib/studies/relay";
import type { UserRole } from "@/lib/auth/session";
import {
  createStudyAudioUploadTarget,
  submitRelayFeedbackAndSubmission,
  submitRelayFinalFeedback,
  submitRelayFirstSubmission,
} from "../actions";

type RelayStudyDetailViewProps = {
  detail: StudyDetail;
  currentUserEmail: string | null;
  role: UserRole;
};

export function RelayStudyDetailView({
  detail,
  currentUserEmail,
  role,
}: RelayStudyDetailViewProps) {
  const router = useRouter();
  const firstOpenQuest = detail.quests.find((quest) => quest.status === "open") ?? detail.quests[0] ?? null;
  const [activeQuestId, setActiveQuestId] = useState(firstOpenQuest?.id ?? "");
  const activeQuest = useMemo(
    () => detail.quests.find((quest) => quest.id === activeQuestId) ?? firstOpenQuest,
    [activeQuestId, detail.quests, firstOpenQuest],
  );
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const resetInputs = () => {
    setComment("");
    setFile(null);
  };

  const handleFirstSubmit = () => {
    if (!activeQuest || !file) {
      setNotice({ tone: "error", text: "음성 파일을 선택하세요." });
      return;
    }

    startTransition(async () => {
      const uploaded = await uploadAudio({ questId: activeQuest.id, file });
      if (!uploaded.success) {
        setNotice({ tone: "error", text: uploaded.error });
        return;
      }

      const result = await submitRelayFirstSubmission({
        questId: activeQuest.id,
        fileName: file.name,
        sizeBytes: file.size,
        contentType: uploaded.data.contentType,
        audioPath: uploaded.data.path,
      });
      finishAction(result, "첫 음성을 제출했습니다.");
    });
  };

  const handleFeedbackAndUpload = () => {
    const pendingSubmission = activeQuest?.relay.pendingSubmission;
    if (!activeQuest || !pendingSubmission || !file) {
      setNotice({ tone: "error", text: "피드백 대상과 음성 파일을 확인하세요." });
      return;
    }
    if (!comment.trim()) {
      setNotice({ tone: "error", text: "피드백 코멘트를 입력하세요." });
      return;
    }

    startTransition(async () => {
      const uploaded = await uploadAudio({ questId: activeQuest.id, file });
      if (!uploaded.success) {
        setNotice({ tone: "error", text: uploaded.error });
        return;
      }

      const result = await submitRelayFeedbackAndSubmission({
        questId: activeQuest.id,
        targetSubmissionId: pendingSubmission.id,
        comment,
        fileName: file.name,
        sizeBytes: file.size,
        contentType: uploaded.data.contentType,
        audioPath: uploaded.data.path,
      });
      finishAction(result, "피드백과 내 음성을 제출했습니다.");
    });
  };

  const handleFinalFeedback = () => {
    const pendingSubmission = activeQuest?.relay.pendingSubmission;
    if (!activeQuest || !pendingSubmission) {
      setNotice({ tone: "error", text: "마지막 피드백 대상을 확인하세요." });
      return;
    }
    if (!comment.trim()) {
      setNotice({ tone: "error", text: "피드백 코멘트를 입력하세요." });
      return;
    }

    startTransition(async () => {
      const result = await submitRelayFinalFeedback({
        questId: activeQuest.id,
        targetSubmissionId: pendingSubmission.id,
        comment,
      });
      finishAction(result, "마지막 피드백으로 릴레이를 완료했습니다.");
    });
  };

  const finishAction = (result: { success: boolean; error?: string }, successText: string) => {
    if (result.success) {
      setNotice({ tone: "success", text: successText });
      resetInputs();
      router.refresh();
      return;
    }
    setNotice({ tone: "error", text: result.error ?? "제출을 완료하지 못했습니다." });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-extrabold tracking-tight text-gray-900">
            {detail.group.title}
          </h2>
          <p className="mt-1 text-sm font-medium leading-tight text-gray-500">
            {detail.group.description || "릴레이 스터디"}
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={() => router.refresh()}>
          <HugeiconsIcon icon={RefreshIcon} size={15} color="currentColor" />
          새로고침
        </Button>
      </div>

      {detail.quests.length === 0 ? (
        <Card>
          <CardBody className="py-14 text-center">
            <HugeiconsIcon icon={BookOpen01Icon} size={34} color="currentColor" className="mx-auto text-gray-300" />
            <p className="mt-4 text-sm font-extrabold text-gray-600">등록된 퀘스트가 없습니다.</p>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {detail.quests.map((quest) => (
              <button
                key={quest.id}
                type="button"
                onClick={() => {
                  setActiveQuestId(quest.id);
                  resetInputs();
                  setNotice(null);
                }}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-extrabold transition-colors ${
                  activeQuest?.id === quest.id
                    ? "border-periwinkle-200 bg-periwinkle-100 text-periwinkle-700"
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {quest.scriptTitle}
              </button>
            ))}
          </div>

          {activeQuest && (
            <>
              {notice && (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
                    notice.tone === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {notice.text}
                </div>
              )}

              <QuestHeader quest={activeQuest} />

              <div className="grid items-start gap-4 xl:grid-cols-[1fr_1.1fr_0.75fr]">
                <CompletedStackCard quest={activeQuest} />
                <PendingRelayCard
                  quest={activeQuest}
                  role={role}
                  currentUserEmail={currentUserEmail}
                  comment={comment}
                  file={file}
                  isPending={isPending}
                  onCommentChange={setComment}
                  onFileChange={setFile}
                  onFirstSubmit={handleFirstSubmit}
                  onFeedbackAndUpload={handleFeedbackAndUpload}
                  onFinalFeedback={handleFinalFeedback}
                />
                <UnsubmittedMembersCard quest={activeQuest} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function QuestHeader({ quest }: { quest: StudyQuestDetail }) {
  return (
    <Card>
      <CardBody className="grid gap-4 py-4 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-periwinkle-200 bg-periwinkle-50 px-2.5 py-1 text-[11px] font-extrabold leading-none text-periwinkle-700">
              {getStatusLabel(quest.relay.status)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-400">
              <HugeiconsIcon icon={Calendar01Icon} size={13} color="currentColor" />
              {formatDateTime(quest.dueAt)}
            </span>
          </div>
          <h3 className="mt-3 text-base font-extrabold leading-tight text-gray-900">
            {quest.scriptTitle}
          </h3>
          <pre className="mt-3 max-h-36 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-gray-100 bg-gray-50 p-3 font-sans text-sm font-medium leading-relaxed text-gray-700">
            {quest.scriptContent}
          </pre>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center md:min-w-52">
          <Metric label="완료" value={`${quest.relay.completedSubmissions.length}`} />
          <Metric label="제출" value={`${quest.relay.submissions.length}`} />
          <Metric label="미참여" value={`${quest.relay.unsubmittedMembers.length}`} />
        </div>
      </CardBody>
    </Card>
  );
}

function CompletedStackCard({ quest }: { quest: StudyQuestDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} color="currentColor" />
          완료 스택
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {quest.relay.completedSubmissions.length === 0 ? (
          <EmptyPanel text="아직 피드백 완료된 음성이 없습니다." />
        ) : (
          quest.relay.completedSubmissions.map((submission) => (
            <AudioFeedbackCard key={submission.id} submission={submission} compact />
          ))
        )}
      </CardBody>
    </Card>
  );
}

function PendingRelayCard({
  quest,
  role,
  currentUserEmail,
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
  currentUserEmail: string | null;
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
  const isStudent = role === "student" && Boolean(currentUserEmail);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HugeiconsIcon icon={Comment01Icon} size={18} color="currentColor" />
          현재 릴레이
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        {!pendingSubmission ? (
          quest.relay.isComplete ? (
            <EmptyPanel text="이번 퀘스트 릴레이가 완료되었습니다." />
          ) : (
            <div className="space-y-4">
              <EmptyPanel text="첫 음성을 기다리고 있습니다." />
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
            <AudioFeedbackCard submission={pendingSubmission} />

            {quest.relay.canFeedbackAndUpload && (
              <div className="space-y-3">
                <FeedbackTextarea value={comment} onChange={onCommentChange} />
                <UploadControl
                  file={file}
                  isPending={isPending}
                  buttonLabel="피드백 남기고 내 음성 제출"
                  onFileChange={onFileChange}
                  onSubmit={onFeedbackAndUpload}
                />
              </div>
            )}

            {quest.relay.canFinalFeedback && (
              <div className="space-y-3">
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
                  pendingSubmission.studentEmail === currentUserEmail
                    ? "내 음성이 피드백을 기다리고 있습니다."
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

function UnsubmittedMembersCard({ quest }: { quest: StudyQuestDetail }) {
  return (
    <Card className="xl:sticky xl:top-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HugeiconsIcon icon={UserGroupIcon} size={18} color="currentColor" />
          미참여 명단
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-2">
        {quest.relay.unsubmittedMembers.length === 0 ? (
          <EmptyPanel text="모든 멤버가 음성을 제출했습니다." />
        ) : (
          quest.relay.unsubmittedMembers.map((member) => (
            <div
              key={member.email}
              className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-gray-800">{member.displayName}</p>
                <p className="truncate text-[11px] font-medium text-gray-400">{member.email}</p>
              </div>
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}

function AudioFeedbackCard({
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
        <audio
          controls
          preload="none"
          src={submission.audioUrl}
          className="mt-3 w-full"
        />
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

function FeedbackTextarea({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-extrabold text-gray-500">
        피드백 코멘트
      </label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium leading-relaxed text-gray-800 focus:border-periwinkle-300"
        placeholder="듣고 느낀 점을 남겨주세요."
      />
    </div>
  );
}

function UploadControl({
  file,
  isPending,
  buttonLabel,
  onFileChange,
  onSubmit,
}: {
  file: File | null;
  isPending: boolean;
  buttonLabel: string;
  onFileChange: (value: File | null) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-3">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-white px-3 py-4 text-sm font-extrabold text-gray-600">
        <HugeiconsIcon icon={CloudUploadIcon} size={18} color="currentColor" />
        <span className="truncate">{file?.name ?? "음성 파일 선택"}</span>
        <input
          type="file"
          accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav"
          className="sr-only"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />
      </label>
      <Button type="button" disabled={isPending || !file} onClick={onSubmit} className="w-full">
        {isPending ? "제출 중..." : buttonLabel}
      </Button>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm font-bold text-gray-400">
      {text}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-2 py-2">
      <p className="text-base font-extrabold leading-none text-gray-900">{value}</p>
      <p className="mt-1 text-[10px] font-bold leading-none text-gray-400">{label}</p>
    </div>
  );
}

async function uploadAudio({ questId, file }: { questId: string; file: File }) {
  const target = await createStudyAudioUploadTarget({
    questId,
    fileName: file.name,
    sizeBytes: file.size,
    contentType: file.type,
  });

  if (!target.success) return target;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(STUDY_AUDIO_BUCKET)
    .uploadToSignedUrl(target.data.path, target.data.token, file, {
      contentType: target.data.contentType,
    });

  if (error) return { success: false as const, error: "음성 파일 업로드에 실패했습니다." };

  return {
    success: true as const,
    data: {
      path: target.data.path,
      contentType: target.data.contentType,
    },
  };
}

function getStatusLabel(status: StudyQuestDetail["relay"]["status"]) {
  if (status === "not_started") return "시작 전";
  if (status === "waiting_feedback") return "피드백 대기";
  if (status === "waiting_final_feedback") return "마지막 피드백";
  return "완료";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
