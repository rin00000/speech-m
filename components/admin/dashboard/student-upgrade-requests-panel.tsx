"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, CheckmarkCircle01Icon, UserIcon } from "@hugeicons/core-free-icons";
import {
  approveStudentUpgradeRequest,
  rejectStudentUpgradeRequest,
} from "@/app/(admin)/dashboard/actions";

/**
 * Renders pending student upgrade requests and admin approval controls.
 */

export type StudentUpgradeRequestItem = {
  id: string;
  email: string;
  display_name: string | null;
  message: string;
  requested_at: string;
};

type PendingAction = {
  id: string;
  type: "approve" | "reject";
} | null;

export function StudentUpgradeRequestsPanel({
  initialRequests,
}: {
  initialRequests: StudentUpgradeRequestItem[];
}) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleResolve = (requestId: string, type: "approve" | "reject") => {
    setPendingAction({ id: requestId, type });
    setNotice(null);
    setErrorMessage(null);

    startTransition(async () => {
      const result =
        type === "approve"
          ? await approveStudentUpgradeRequest(requestId)
          : await rejectStudentUpgradeRequest(requestId);

      if (!result.success) {
        setErrorMessage(result.error ?? "등업 문의 처리 중 오류가 발생했습니다.");
        setPendingAction(null);
        return;
      }

      setRequests((prev) => prev.filter((request) => request.id !== requestId));
      setNotice(type === "approve" ? "수강생 등업을 승인했습니다." : "등업 문의를 반려했습니다.");
      setPendingAction(null);
      router.refresh();
    });
  };

  if (requests.length === 0 && !notice) return null;

  return (
    <section
      id="student-upgrade-requests"
      className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm md:rounded-3xl md:p-5"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-white text-amber-600">
            <HugeiconsIcon icon={UserIcon} size={18} color="currentColor" strokeWidth={1.8} />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-gray-900">수강생 등업 문의</h2>
            <p className="mt-1 text-xs font-medium leading-snug text-gray-600">
              승인하면 즉시 수강생 권한이 부여되고, 반려하면 요청만 닫힙니다.
            </p>
          </div>
        </div>
        {requests.length > 0 && (
          <span className="inline-flex self-start rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-extrabold text-amber-700">
            대기 {requests.length}건
          </span>
        )}
      </div>

      {notice && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={15} color="currentColor" />
          <span>{notice}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      {requests.length > 0 && (
        <div className="mt-4 divide-y divide-amber-100 overflow-hidden rounded-2xl border border-amber-100 bg-white">
          {requests.map((request) => {
            const isResolving = isPending && pendingAction?.id === request.id;
            const requestedAt = new Date(request.requested_at).toLocaleString("ko-KR");

            return (
              <article key={request.id} className="p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-extrabold text-gray-900">
                        {request.display_name ?? "이름 미상"}
                      </h3>
                      <span className="break-all text-xs font-semibold text-gray-400">{request.email}</span>
                    </div>
                    <p className="mt-1 text-[11px] font-medium text-gray-400">{requestedAt}</p>
                    {request.message ? (
                      <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-gray-50 px-3 py-2 text-xs font-medium leading-relaxed text-gray-700">
                        {request.message}
                      </p>
                    ) : (
                      <p className="mt-3 text-xs font-medium text-gray-400">문의 메모 없음</p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => handleResolve(request.id, "reject")}
                      disabled={isResolving}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={14} color="currentColor" />
                      <span>{isResolving && pendingAction?.type === "reject" ? "반려 중" : "반려"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolve(request.id, "approve")}
                      disabled={isResolving}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full bg-periwinkle-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-periwinkle-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} color="currentColor" />
                      <span>{isResolving && pendingAction?.type === "approve" ? "승인 중" : "승인"}</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
