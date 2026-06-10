"use client";

/**
 * 릴레이 스터디 상세 화면의 상태 조립 컴포넌트.
 * 활성 퀘스트, 피드백 입력, 파일 선택, 제출 액션만 관리하고 카드 UI는 하위 컴포넌트에 위임한다.
 */

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { BookOpen01Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import type { UserRole } from "@/lib/auth/session";
import type { StudyDetail } from "@/lib/studies/data";
import {
  submitRelayFeedbackAndSubmission,
  submitRelayFinalFeedback,
  submitRelayFirstSubmission,
} from "../../actions";
import { uploadAudio } from "../_lib/relay-study-audio-upload";
import {
  CompletedStackCard,
  PendingRelayCard,
  UnsubmittedMembersCard,
} from "./relay-study-cards";
import { QuestHeader } from "./relay-study-quest-header";

type RelayStudyDetailViewProps = {
  detail: StudyDetail;
  currentUserId: string | null;
  role: UserRole;
};

export function RelayStudyDetailView({
  detail,
  currentUserId,
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

  const finishAction = (result: { success: boolean; error?: string }, successText: string) => {
    if (result.success) {
      setNotice({ tone: "success", text: successText });
      resetInputs();
      router.refresh();
      return;
    }
    setNotice({ tone: "error", text: result.error ?? "제출을 완료하지 못했습니다." });
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

              <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
                <div className="xl:sticky xl:top-4">
                  <QuestHeader quest={activeQuest} />
                </div>
                <div className="grid items-start gap-4">
                  <PendingRelayCard
                    quest={activeQuest}
                    role={role}
                    currentUserId={currentUserId}
                    comment={comment}
                    file={file}
                    isPending={isPending}
                    onCommentChange={setComment}
                    onFileChange={setFile}
                    onFirstSubmit={handleFirstSubmit}
                    onFeedbackAndUpload={handleFeedbackAndUpload}
                    onFinalFeedback={handleFinalFeedback}
                  />
                  <CompletedStackCard
                    quest={activeQuest}
                    currentUserId={currentUserId}
                  />
                  <UnsubmittedMembersCard quest={activeQuest} />
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
