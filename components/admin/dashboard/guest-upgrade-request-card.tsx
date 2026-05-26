"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { submitStudentUpgradeRequest } from "@/app/(admin)/dashboard/student-upgrade-actions";

/**
 * Handles guest self-service student upgrade requests from the dashboard.
 */

type PendingUpgradeRequest = {
  message: string;
  requested_at: string;
} | null;

export function GuestUpgradeRequestCard({
  pendingRequest,
}: {
  pendingRequest: PendingUpgradeRequest;
}) {
  const router = useRouter();
  const [message, setMessage] = useState(pendingRequest?.message ?? "");
  const [statusMessage, setStatusMessage] = useState<string | null>(
    pendingRequest ? "등업 문의가 원장 대시보드에 전달되어 승인 대기 중입니다." : null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestedAt, setRequestedAt] = useState(pendingRequest?.requested_at ?? null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    startTransition(async () => {
      const result = await submitStudentUpgradeRequest(message);

      if (!result.success) {
        setErrorMessage(result.error ?? "등업 문의를 보내는 중 오류가 발생했습니다.");
        return;
      }

      setRequestedAt(result.requestedAt ?? new Date().toISOString());
      setStatusMessage("등업 문의가 원장 대시보드에 전달되었습니다.");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 border-t border-gray-150 pt-6 text-left">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-periwinkle-100 bg-periwinkle-50 text-periwinkle-700">
          <HugeiconsIcon icon={UserIcon} size={18} color="currentColor" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold text-gray-900">수강생 등업 문의</h3>
          <p className="mt-1 text-xs font-medium leading-snug text-gray-500">
            원장님이 확인할 수 있도록 짧은 메모를 남겨주세요. 메모 없이도 문의를 보낼 수 있습니다.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="student-upgrade-message" className="mb-1.5 block text-xs font-bold text-gray-700">
          문의 메모
        </label>
        <textarea
          id="student-upgrade-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={500}
          rows={4}
          className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-periwinkle-500 focus:bg-white focus:ring-1 focus:ring-periwinkle-500"
          placeholder="예: 등록 상담 완료했습니다."
        />
        <div className="mt-1 flex items-center justify-between gap-3 text-[11px] font-medium text-gray-400">
          <span>{requestedAt ? `최근 문의: ${new Date(requestedAt).toLocaleString("ko-KR")}` : "아직 보낸 문의가 없습니다."}</span>
          <span className="tabular-nums">{message.length}/500</span>
        </div>
      </div>

      {statusMessage && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={15} color="currentColor" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-periwinkle-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-periwinkle-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "문의 전송 중..." : pendingRequest || requestedAt ? "등업 문의 갱신하기" : "등업 문의 보내기"}
      </button>
    </form>
  );
}
