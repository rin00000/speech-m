"use client";

/**
 * 스터디 상세 진입 전에 수강생 실명을 입력받는 게이트 화면.
 * 닉네임과 분리된 real_name만 저장한 뒤 같은 스터디 상세를 다시 렌더링한다.
 */

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserGroupIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { saveStudyRealName } from "../../actions";
import type { StudyRealNameState } from "../../_actions/study-profile-actions";

const initialState: StudyRealNameState = {
  success: false,
};

export function StudyRealNameGate({
  studyId,
  studyTitle,
  displayName,
}: {
  studyId: string;
  studyTitle: string;
  displayName: string | null;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    saveStudyRealName.bind(null, studyId),
    initialState,
  );

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-gray-50/50 p-4 md:p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:rounded-3xl md:p-8">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-periwinkle-50 text-periwinkle-600">
          <HugeiconsIcon icon={UserGroupIcon} size={26} color="currentColor" />
        </span>
        <h2 className="mt-5 text-xl font-extrabold tracking-tight text-gray-900">
          스터디 참여 실명이 필요합니다
        </h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-gray-500">
          {studyTitle}에 참여하려면 운영 확인용 실명을 먼저 저장해야 합니다.
        </p>
        {displayName && (
          <p className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500">
            현재 닉네임: {displayName}
          </p>
        )}
        <form action={formAction} className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-extrabold text-gray-600">
              실명
            </span>
            <input
              name="realName"
              type="text"
              required
              minLength={2}
              maxLength={40}
              autoComplete="name"
              placeholder="예: 김민지"
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-periwinkle-300"
            />
          </label>
          {state.error && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              {state.error}
            </p>
          )}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "저장 중..." : "실명 저장하고 입장"}
          </Button>
        </form>
      </div>
    </div>
  );
}
