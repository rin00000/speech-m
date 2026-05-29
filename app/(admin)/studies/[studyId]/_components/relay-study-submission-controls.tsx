"use client";

/**
 * 릴레이 제출 카드에서 쓰는 피드백 입력과 음성 파일 선택 컨트롤.
 * 제출 버튼 활성화 조건과 파일 입력 UI를 한곳에서 관리한다.
 */

import { HugeiconsIcon } from "@hugeicons/react";
import { CloudUploadIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

export function FeedbackTextarea({
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

export function UploadControl({
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
