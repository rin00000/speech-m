"use client";

/**
 * 릴레이 제출 카드에서 쓰는 피드백 입력과 음성 파일 선택 컨트롤.
 * 제출 버튼 활성화 조건과 파일 입력 UI를 한곳에서 관리한다.
 */

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, CloudUploadIcon, VolumeHighIcon } from "@hugeicons/core-free-icons";
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const handleFileSelect = (selectedFile: File | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (!selectedFile) {
      setPreviewUrl(null);
      onFileChange(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    previewUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    onFileChange(selectedFile);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-3">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-white px-3 py-4 text-sm font-extrabold text-gray-600">
        <HugeiconsIcon icon={CloudUploadIcon} size={18} color="currentColor" />
        <span className="truncate">{file?.name ?? "음성 파일 선택"}</span>
        <input
          type="file"
          accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav"
          className="sr-only"
          onChange={(event) => handleFileSelect(event.target.files?.[0] ?? null)}
        />
      </label>
      {file && (
        <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
          <div className="flex items-start gap-2 text-xs font-bold leading-snug text-amber-800">
            <HugeiconsIcon
              icon={AlertCircleIcon}
              size={15}
              color="currentColor"
              strokeWidth={1.9}
              className="mt-0.5 shrink-0"
            />
            <p>
              제출 후에는 녹음본을 수정하거나 교체할 수 없습니다. 아래 플레이어로
              파일을 한 번 확인한 뒤 제출해 주세요.
            </p>
          </div>
          {previewUrl && (
            <div className="rounded-2xl border border-amber-100 bg-white p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-gray-700">
                <HugeiconsIcon icon={VolumeHighIcon} size={14} color="currentColor" />
                <span className="truncate">{file.name}</span>
              </div>
              <audio controls preload="metadata" src={previewUrl} className="w-full" />
            </div>
          )}
        </div>
      )}
      <Button type="button" disabled={isPending || !file} onClick={onSubmit} className="w-full">
        {isPending ? "제출 중..." : buttonLabel}
      </Button>
    </div>
  );
}
