"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CalendarUserIcon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Coupon01Icon,
} from "@hugeicons/core-free-icons";
import {
  applyToManagementClass,
  cancelMyManagementClassApplication,
} from "@/app/(admin)/management-classes/actions";
import type { StudentManagementClassNotice } from "@/lib/management-classes/data";
import { formatManagementClassShortDateTime } from "@/lib/management-classes/format";

type PendingAction =
  | { id: string; type: "apply" | "cancel" }
  | null;

export function ManagementClassNoticesPanel({
  notices,
}: {
  notices: StudentManagementClassNotice[];
}) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [noticeText, setNoticeText] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (notices.length === 0) return null;

  const run = (
    id: string,
    type: "apply" | "cancel",
    fn: () => Promise<{ success: boolean; error?: string }>,
    successText: string,
  ) => {
    setPendingAction({ id, type });
    setNoticeText(null);
    setErrorText(null);

    startTransition(async () => {
      const result = await fn();
      if (!result.success) {
        setErrorText(result.error ?? "처리 중 오류가 발생했습니다.");
        setPendingAction(null);
        return;
      }

      setNoticeText(successText);
      setPendingAction(null);
      router.refresh();
    });
  };

  return (
    <section className="rounded-2xl border border-periwinkle-200 bg-periwinkle-50/70 p-4 shadow-sm md:rounded-3xl md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-periwinkle-200 bg-white text-periwinkle-700">
            <HugeiconsIcon icon={CalendarUserIcon} size={18} color="currentColor" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-gray-900">관리반 오픈 공지</h2>
            <p className="mt-1 text-xs font-medium leading-snug text-gray-600">
              원장님 일정이 열리면 선착순으로 신청할 수 있습니다.
            </p>
          </div>
        </div>
        <span className="inline-flex self-start rounded-full border border-periwinkle-200 bg-white px-3 py-1 text-xs font-extrabold text-periwinkle-700">
          공지 {notices.length}건
        </span>
      </div>

      {noticeText && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={15} color="currentColor" />
          <span>{noticeText}</span>
        </div>
      )}

      {errorText && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700">
          <HugeiconsIcon icon={Cancel01Icon} size={15} color="currentColor" />
          <span>{errorText}</span>
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {notices.map((item) => {
          const application = item.application;
          const pending = isPending && pendingAction?.id === item.id;
          const isApplied = Boolean(application);
          const canApply = !isApplied && !item.isFull && item.availableCouponCount > 0;
          const buttonLabel = isApplied
            ? application?.canCancel
              ? pending
                ? "취소 중..."
                : "신청 취소"
              : "취소 마감"
            : pending
              ? "신청 중..."
              : item.isFull
                ? "정원 마감"
                : item.availableCouponCount > 0
                  ? "신청하기"
                  : "쿠폰 필요";

          return (
            <article
              key={item.id}
              className="rounded-2xl border border-periwinkle-100 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-periwinkle-200 bg-periwinkle-50 px-2.5 py-1 text-[11px] font-extrabold leading-none text-periwinkle-700">
                      {isApplied ? "신청 완료" : item.isFull ? "마감" : `잔여 ${item.remainingSeats}석`}
                    </span>
                    <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold leading-none text-gray-500">
                      정원 {item.capacity}명
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-extrabold leading-tight text-gray-900">
                    {item.startsAtLabel}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-gray-500">
                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">
                      <HugeiconsIcon icon={Coupon01Icon} size={13} color="currentColor" />
                      보유 {item.availableCouponCount}회
                    </span>
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1">
                      {isApplied
                        ? `사용 쿠폰 ${application?.couponLabel ?? "-"}`
                        : item.nextCouponLabel
                          ? `다음 쿠폰 ${item.nextCouponLabel}`
                          : "사용 가능 쿠폰 없음"}
                    </span>
                  </div>
                  {application?.cancelClosesAt && (
                    <p className="mt-2 text-[11px] font-medium leading-snug text-gray-400">
                      직접 취소 가능: {formatManagementClassShortDateTime(application.cancelClosesAt)}까지
                    </p>
                  )}
                </div>

                {isApplied ? (
                  <button
                    type="button"
                    disabled={pending || !application?.canCancel}
                    onClick={() => {
                      if (!application) return;
                      run(
                        item.id,
                        "cancel",
                        () => cancelMyManagementClassApplication(application.id),
                        "관리반 신청을 취소했습니다.",
                      );
                    }}
                    className="inline-flex shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2.5 text-xs font-extrabold text-gray-700 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {buttonLabel}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pending || !canApply}
                    onClick={() =>
                      run(
                        item.id,
                        "apply",
                        () => applyToManagementClass(item.id),
                        "관리반 신청을 완료했습니다.",
                      )
                    }
                    className="inline-flex shrink-0 items-center justify-center rounded-full bg-periwinkle-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-periwinkle-700 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {buttonLabel}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
