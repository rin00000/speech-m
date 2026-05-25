"use client";

/**
 * AI 외부 초안용 프롬프트 클립보드 복사 버튼.
 * 내부 게시 확정 공고에 대해 외부 LLM용 초안 프롬프트를 서버에서 받아 클립보드에 복사한다.
 * useAsyncAction 훅을 통해 글로벌 Progress Bar와 연동된다.
 */

import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon } from "@hugeicons/core-free-icons";
import { getJobPostDraftPrompt } from "@/app/(admin)/jobs/actions";
import { useAsyncAction } from "@/lib/ui/use-async-action";

type Props = {
  jobId: string;
  className?: string;
};

export const AiPostPromptCopyButton = ({ jobId, className }: Props) => {
  const { isPending, runAction } = useAsyncAction();

  const handleClick = () => {
    runAction(async () => {
      const result = await getJobPostDraftPrompt(jobId);
      if (!result.success) {
        window.alert(result.error);
        return;
      }
      try {
        await navigator.clipboard.writeText(result.prompt);
      } catch {
        window.prompt("클립보드에 복사하지 못했습니다. 아래 텍스트를 수동으로 복사하세요.", result.prompt);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={isPending}
      title="AI 외부 초안용 프롬프트를 클립보드에 복사"
      className={
        className ??
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-periwinkle-100 hover:text-periwinkle-700 disabled:cursor-not-allowed disabled:opacity-40"
      }
    >
      <HugeiconsIcon
        icon={Copy01Icon}
        size={16}
        color="currentColor"
        strokeWidth={isPending ? 2.5 : 1.8}
        className={isPending ? "animate-pulse" : ""}
      />
    </button>
  );
};
