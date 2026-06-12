"use client";

/**
 * 관리반 운영 공지와 쿠폰 발급을 처리하는 관리자 전용 화면입니다.
 */

import type { InputHTMLAttributes, ReactNode } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CalendarAdd01Icon,
  CalendarUserIcon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Coupon01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MANAGEMENT_CLASS_CAPACITY_MAX,
  MANAGEMENT_CLASS_CAPACITY_MIN,
} from "@/lib/management-classes/constants";
import type { AdminManagementClassOpsData } from "@/lib/management-classes/data";
import {
  cancelManagementClass,
  cancelManagementClassApplication,
  createManagementClass,
  grantManagementClassCoupons,
} from "./actions";

type NoticeState = {
  tone: "success" | "error";
  text: string;
} | null;

type ActionResult = {
  success: boolean;
  error?: string;
};

type ActionRunner = (
  fn: () => Promise<ActionResult>,
  successText: string
) => void;

type ManagementClassViewProps = {
  data: AdminManagementClassOpsData;
  run: ActionRunner;
  isPending: boolean;
};

export function ManagementClassesAdminView({ data }: { data: AdminManagementClassOpsData }) {
  const router = useRouter();
  const [notice, setNotice] = useState<NoticeState>(null);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"notice" | "coupon">("notice");

  const run = (
    fn: () => Promise<{ success: boolean; error?: string }>,
    successText: string
  ) => {
    setNotice(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.success) {
        setNotice({ tone: "error", text: result.error ?? "작업을 완료하지 못했습니다." });
        return;
      }

      setNotice({ tone: "success", text: successText });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {notice && (
        <div
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${
            notice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <HugeiconsIcon
            icon={notice.tone === "success" ? CheckmarkCircle01Icon : Cancel01Icon}
            size={16}
            color="currentColor"
          />
          <span>{notice.text}</span>
        </div>
      )}

      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("notice")}
          className={`pb-3 text-sm font-extrabold transition-colors border-b-2 ${
            activeTab === "notice"
              ? "border-periwinkle-600 text-periwinkle-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          예약 공지 관리
        </button>
        <button
          onClick={() => setActiveTab("coupon")}
          className={`pb-3 text-sm font-extrabold transition-colors border-b-2 ${
            activeTab === "coupon"
              ? "border-periwinkle-600 text-periwinkle-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          수강생 쿠폰 관리
        </button>
      </div>

      {activeTab === "notice" && (
        <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr] items-start">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="운영 공지" value={`${data.classes.filter((item) => item.status === "open").length}`} />
              <Metric
                label="활성 신청"
                value={`${data.classes.reduce((sum, item) => sum + item.activeApplicationCount, 0)}`}
              />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HugeiconsIcon icon={CalendarAdd01Icon} size={18} color="currentColor" />
                  새 공지 등록
                </CardTitle>
              </CardHeader>
              <CardBody>
                <NoticeForm run={run} isPending={isPending} />
              </CardBody>
            </Card>
          </div>
          <div className="space-y-4">
            <NoticeList data={data} run={run} isPending={isPending} />
          </div>
        </div>
      )}

      {activeTab === "coupon" && (
        <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr] items-start">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <Metric
                label="총 발급 잔여 쿠폰"
                value={`${data.couponGrants.reduce((sum, grant) => sum + grant.availableCount, 0)}`}
              />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HugeiconsIcon icon={Coupon01Icon} size={18} color="currentColor" />
                  신규 쿠폰 발급
                </CardTitle>
              </CardHeader>
              <CardBody>
                <CouponForm data={data} run={run} isPending={isPending} />
              </CardBody>
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">최근 쿠폰 발급 내역</CardTitle>
              </CardHeader>
              <CardBody>
                <CouponList data={data} />
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------
// Shared Sub-components
// --------------------------------------------------------

function NoticeForm({ run, isPending }: Omit<ManagementClassViewProps, "data">) {
  return (
    <form
      action={(formData) => run(() => createManagementClass(formData), "관리반 공지를 등록했습니다.")}
      className="space-y-4"
    >
      <FieldLabel label="날짜/시간">
        <span className="mb-1 block text-[11px] font-semibold text-gray-400">서울 시간 기준으로 입력합니다.</span>
        <TextInput name="startsAt" type="datetime-local" required />
      </FieldLabel>
      <FieldLabel label="정원">
        <TextInput
          name="capacity"
          type="number"
          min={MANAGEMENT_CLASS_CAPACITY_MIN}
          max={MANAGEMENT_CLASS_CAPACITY_MAX}
          defaultValue={4}
          required
        />
      </FieldLabel>
      <div className="pt-2">
        <Button type="submit" disabled={isPending} className="w-full">
          공지 등록
        </Button>
      </div>
    </form>
  );
}

function CouponForm({ data, run, isPending }: ManagementClassViewProps) {
  return (
    <form
      action={(formData) => run(() => grantManagementClassCoupons(formData), "관리반 쿠폰을 발급했습니다.")}
      className="space-y-4"
    >
      <FieldLabel label="수강생">
        <select
          name="studentUserId"
          defaultValue=""
          required
          disabled={data.students.length === 0}
          className="w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 focus:border-periwinkle-300 disabled:bg-gray-50 disabled:text-gray-400"
        >
          {data.students.length === 0 ? (
            <option value="">수강생 없음</option>
          ) : (
            <>
              <option value="" disabled>수강생 선택</option>
              {data.students.map((student) => (
                <option key={student.userId} value={student.userId}>
                  {student.displayName} · {student.email ?? student.userId}
                </option>
              ))}
            </>
          )}
        </select>
      </FieldLabel>
      <FieldLabel label="발급 개수">
        <TextInput name="totalCount" type="number" min={1} max={100} defaultValue={5} required />
      </FieldLabel>
      <FieldLabel label="메모">
        <TextInput name="note" placeholder="오프라인 결제 확인 등" />
      </FieldLabel>
      <div className="pt-2">
        <Button type="submit" disabled={isPending || data.students.length === 0} className="w-full">
          쿠폰 발급
        </Button>
      </div>
    </form>
  );
}

function NoticeList({ data, run, isPending }: ManagementClassViewProps) {
  if (data.classes.length === 0) {
    return <EmptyPanel text="아직 등록한 관리반 공지가 없습니다." />;
  }
  return (
    <div className="space-y-4">
      {data.classes.map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-periwinkle-100 bg-periwinkle-50 text-periwinkle-700">
                  <HugeiconsIcon icon={CalendarUserIcon} size={18} color="currentColor" />
                </span>
                <div className="min-w-0">
                  <CardTitle className="text-base">{item.startsAtLabel}</CardTitle>
                  <p className="mt-1 text-xs font-medium text-gray-500">
                    신청 {item.activeApplicationCount}/{item.capacity}명 · 잔여 {item.remainingSeats}석
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <StatusBadge status={item.status} />
                {item.status !== "canceled" && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      run(
                        () => cancelManagementClass(item.id),
                        "관리반 공지를 취소하고 신청 쿠폰을 복구했습니다."
                      )
                    }
                    className="inline-flex items-center justify-center rounded-full border border-red-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-red-600 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50"
                  >
                    공지 취소
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {item.applications.length === 0 ? (
              <EmptyPanel text="아직 신청자가 없습니다." />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-100">
                <div className="hidden grid-cols-[1.2fr_0.7fr_0.7fr_auto] gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3 text-[11px] font-extrabold text-gray-400 md:grid">
                  <span>수강생</span>
                  <span>사용 쿠폰</span>
                  <span>신청 시각</span>
                  <span className="text-right">관리</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {item.applications.map((application) => (
                    <article
                      key={application.id}
                      className="grid gap-3 px-4 py-3 md:grid-cols-[1.2fr_0.7fr_0.7fr_auto] md:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-gray-900">{application.studentName}</p>
                        <p className="mt-1 break-all text-[11px] font-medium text-gray-400">
                          {application.studentEmail ?? application.studentUserId}
                        </p>
                      </div>
                      <span className="inline-flex w-fit rounded-full border border-periwinkle-200 bg-periwinkle-50 px-2.5 py-1 text-xs font-extrabold leading-none text-periwinkle-700">
                        {application.couponLabel}
                      </span>
                      <span className="text-xs font-semibold text-gray-500">{application.appliedAtLabel}</span>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          run(
                            () => cancelManagementClassApplication(application.id),
                            "신청을 취소하고 쿠폰을 복구했습니다."
                          )
                        }
                        className="inline-flex justify-center rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-extrabold text-gray-700 hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50 md:justify-self-end"
                      >
                        신청 취소
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function CouponList({ data }: { data: AdminManagementClassOpsData }) {
  if (data.couponGrants.length === 0) {
    return <EmptyPanel text="아직 발급한 관리반 쿠폰이 없습니다." />;
  }
  return (
    <div className="space-y-2">
      {data.couponGrants.map((grant) => (
        <article key={grant.id} className="rounded-2xl border border-gray-100 bg-gray-50/70 px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-gray-900">{grant.studentName}</p>
              <p className="mt-1 break-all text-[11px] font-medium text-gray-400">
                {grant.studentEmail ?? grant.studentUserId}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold leading-none text-gray-500">
              잔여 {grant.availableCount}/{grant.totalCount}
            </span>
          </div>
          <p className="mt-2 text-[11px] font-medium text-gray-400">
            {grant.createdAtLabel}
            {grant.note ? ` · ${grant.note}` : ""}
          </p>
        </article>
      ))}
    </div>
  );
}

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-extrabold text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 placeholder:text-gray-400 focus:border-periwinkle-300 ${className}`}
    />
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xl font-extrabold leading-none text-gray-900">{value}</p>
      <p className="mt-1 text-[11px] font-bold leading-none text-gray-400">{label}</p>
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

function StatusBadge({ status }: { status: AdminManagementClassOpsData["classes"][number]["status"] }) {
  const className =
    status === "open"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "closed"
        ? "border-gray-200 bg-gray-50 text-gray-600"
        : "border-red-200 bg-red-50 text-red-700";
  const label = status === "open" ? "오픈" : status === "closed" ? "마감" : "취소";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-extrabold leading-none ${className}`}>
      {label}
    </span>
  );
}
