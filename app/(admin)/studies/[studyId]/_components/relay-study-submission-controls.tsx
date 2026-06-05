"use client";

/**
 * 릴레이 제출 카드에서 쓰는 피드백 입력과 음성 파일 선택 컨트롤.
 * 제출 버튼 활성화 조건과 파일 입력 UI를 한곳에서 관리한다.
 */

import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  CancelCircleIcon,
  CloudUploadIcon,
  Delete02Icon,
  Mic01Icon,
  StopIcon,
  VolumeHighIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  createStudyAudioRecorder,
  getStudyAudioRecorderErrorMessage,
  type StudyAudioRecorder,
} from "../_lib/relay-study-browser-recorder";

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
  const [mode, setMode] = useState<"upload" | "record">("upload");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isStartingRecording, setIsStartingRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const recorderRef = useRef<StudyAudioRecorder | null>(null);
  const isRecording = recordingStartedAt !== null;

  useEffect(() => {
    return () => {
      recorderRef.current?.cancel();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (file) return;
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [file]);

  useEffect(() => {
    if (!recordingStartedAt) return;

    const tick = () => {
      setRecordingSeconds(Math.max(0, Math.floor((Date.now() - recordingStartedAt) / 1000)));
    };

    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [recordingStartedAt]);

  const handleFileSelect = (selectedFile: File | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (!selectedFile) {
      setPreviewUrl(null);
      onFileChange(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    previewUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    onFileChange(selectedFile);
  };

  const cancelRecording = () => {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    setRecordingStartedAt(null);
    setRecordingSeconds(0);
  };

  const handleModeChange = (nextMode: "upload" | "record") => {
    if (isStartingRecording) return;
    if (nextMode !== "record") {
      cancelRecording();
    }
    setRecordingError(null);
    setMode(nextMode);
  };

  const handleStartRecording = async () => {
    if (isPending || isRecording || isStartingRecording) return;

    cancelRecording();
    handleFileSelect(null);
    setRecordingError(null);
    setIsStartingRecording(true);

    try {
      const recorder = await createStudyAudioRecorder();
      recorderRef.current = recorder;
      setRecordingStartedAt(recorder.startedAt);
      setRecordingSeconds(0);
    } catch (error) {
      setRecordingError(getStudyAudioRecorderErrorMessage(error));
    } finally {
      setIsStartingRecording(false);
    }
  };

  const handleStopRecording = async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;

    recorderRef.current = null;
    setRecordingStartedAt(null);

    try {
      const recordedFile = await recorder.stop();
      setRecordingSeconds(0);
      handleFileSelect(recordedFile);
    } catch {
      setRecordingSeconds(0);
      setRecordingError("녹음 파일을 만들지 못했습니다.");
    }
  };

  const handleClearFile = () => {
    handleFileSelect(null);
    setRecordingError(null);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-3">
      <div className="grid grid-cols-2 gap-1 rounded-full border border-gray-200 bg-white p-1">
        <button
          type="button"
          disabled={isStartingRecording}
          onClick={() => handleModeChange("upload")}
          className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-extrabold leading-none transition-colors ${
            mode === "upload"
              ? "bg-periwinkle-600 text-white"
              : "text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          }`}
        >
          <HugeiconsIcon icon={CloudUploadIcon} size={15} color="currentColor" />
          파일 올리기
        </button>
        <button
          type="button"
          disabled={isStartingRecording}
          onClick={() => handleModeChange("record")}
          className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-extrabold leading-none transition-colors ${
            mode === "record"
              ? "bg-periwinkle-600 text-white"
              : "text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          }`}
        >
          <HugeiconsIcon icon={Mic01Icon} size={15} color="currentColor" />
          바로 녹음
        </button>
      </div>

      {mode === "upload" ? (
        <label
          aria-disabled={isPending || isRecording}
          className={`flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-white px-3 py-4 text-sm font-extrabold text-gray-600 ${
            isPending || isRecording ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          }`}
        >
          <HugeiconsIcon icon={CloudUploadIcon} size={18} color="currentColor" />
          <span className="truncate">{file?.name ?? "음성 파일 선택"}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp3,audio/mp4,audio/m4a,audio/x-m4a,audio/wav,audio/wave,audio/x-wav"
            className="sr-only"
            disabled={isPending || isRecording}
            onChange={(event) => handleFileSelect(event.target.files?.[0] ?? null)}
          />
        </label>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-gray-500">바로 녹음</p>
              <p
                className={`mt-1 truncate text-sm font-extrabold ${
                  isRecording ? "text-red-600" : "text-gray-800"
                }`}
              >
                {isRecording ? formatDuration(recordingSeconds) : "마이크로 새 음성 만들기"}
              </p>
            </div>
            {isRecording ? (
              <div className="flex shrink-0 items-center gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={cancelRecording}>
                  <HugeiconsIcon icon={CancelCircleIcon} size={14} color="currentColor" />
                  취소
                </Button>
                <Button type="button" size="sm" onClick={handleStopRecording}>
                  <HugeiconsIcon icon={StopIcon} size={14} color="currentColor" />
                  정지
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="soft"
                disabled={isPending || isStartingRecording}
                onClick={handleStartRecording}
              >
                <HugeiconsIcon icon={Mic01Icon} size={14} color="currentColor" />
                {isStartingRecording ? "준비 중" : "녹음 시작"}
              </Button>
            )}
          </div>
          {isRecording && (
            <div className="mt-3 flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-2 text-xs font-extrabold text-red-600">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              녹음 중
            </div>
          )}
          {recordingError && (
            <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold leading-snug text-red-700">
              {recordingError}
            </p>
          )}
        </div>
      )}

      {file && (
        <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
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
            <button
              type="button"
              onClick={handleClearFile}
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-amber-200 bg-white p-1.5 text-amber-700 hover:bg-amber-100"
              aria-label="선택한 음성 파일 지우기"
            >
              <HugeiconsIcon icon={Delete02Icon} size={14} color="currentColor" />
            </button>
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
      <Button
        type="button"
        disabled={isPending || isRecording || !file}
        onClick={onSubmit}
        className="w-full"
      >
        {isPending ? "제출 중..." : buttonLabel}
      </Button>
    </div>
  );
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
