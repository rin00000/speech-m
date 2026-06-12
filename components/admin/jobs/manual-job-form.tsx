"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  AlertCircleIcon,
  Briefcase01Icon,
  Building02Icon,
  Calendar03Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  LinkSquare01Icon,
  Location01Icon,
} from "@hugeicons/core-free-icons";
import { createManualJobPosting } from "@/app/(admin)/jobs/actions";
import type { ManualJobPostingFieldErrors } from "@/lib/jobs/manual-job-posting";
import { useAsyncAction } from "@/lib/ui/use-async-action";

/**
 * 관리자 공고 목록에서 직접 입력 공고를 등록하는 모달 폼.
 * 등록된 행은 custom 소스와 approved 상태로 저장된다.
 */

type FormState = {
  title: string;
  company: string;
  sourceUrl: string;
  location: string;
  deadline: string;
};

const emptyForm: FormState = {
  title: "",
  company: "",
  sourceUrl: "",
  location: "",
  deadline: "",
};

const inputClassName =
  "h-10 w-full rounded-full border bg-white px-3 text-sm font-medium text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-periwinkle-500 focus:ring-2 focus:ring-periwinkle-100";

const labelClassName = "mb-1.5 flex items-center gap-1.5 text-xs font-extrabold text-gray-500";

const FieldError = ({ message }: { message?: string }) => {
  if (!message) return null;
  return <p className="mt-1 text-[11px] font-semibold leading-tight text-red-600">{message}</p>;
};

export function ManualJobForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<ManualJobPostingFieldErrors>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const { isPending, runAction } = useAsyncAction({
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(error instanceof Error ? error.message : "공고 저장 중 오류가 발생했습니다.");
    },
  });

  const setField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setErrorMessage(null);
    setSuccessMessage(null);

    runAction(async () => {
      const result = await createManualJobPosting(form);
      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
        setErrorMessage(result.error);
        return;
      }

      setForm(emptyForm);
      setSuccessMessage("공고가 추가되었습니다.");
      setTimeout(() => setIsOpen(false), 1500);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
      >
        <HugeiconsIcon icon={Add01Icon} size={15} color="currentColor" strokeWidth={2} />
        수동 공고 추가
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <section className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl md:rounded-3xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 p-4 md:p-5">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-periwinkle-100 text-periwinkle-700">
                  <HugeiconsIcon icon={Add01Icon} size={18} color="currentColor" strokeWidth={2.5} />
                </span>
                <div>
                  <h2 className="text-base font-extrabold leading-tight text-gray-900">직접 공고 추가</h2>
                  <p className="mt-0.5 text-xs font-semibold leading-tight text-gray-500">승인 상태로 즉시 추가됩니다</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>

            <div className="p-4 md:p-5">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="lg:col-span-4">
                  <label htmlFor="manual-job-title" className={labelClassName}>
                    <HugeiconsIcon icon={Briefcase01Icon} size={13} color="currentColor" strokeWidth={2} />
                    공고명
                  </label>
                  <input
                    id="manual-job-title"
                    type="text"
                    value={form.title}
                    onChange={(event) => setField("title", event.target.value)}
                    placeholder="아나운서 채용"
                    className={`${inputClassName} ${fieldErrors.title ? "border-red-300" : "border-gray-200"}`}
                    disabled={isPending}
                  />
                  <FieldError message={fieldErrors.title} />
                </div>

                <div className="lg:col-span-3">
                  <label htmlFor="manual-job-company" className={labelClassName}>
                    <HugeiconsIcon icon={Building02Icon} size={13} color="currentColor" strokeWidth={2} />
                    회사명
                  </label>
                  <input
                    id="manual-job-company"
                    type="text"
                    value={form.company}
                    onChange={(event) => setField("company", event.target.value)}
                    placeholder="방송사명"
                    className={`${inputClassName} ${fieldErrors.company ? "border-red-300" : "border-gray-200"}`}
                    disabled={isPending}
                  />
                  <FieldError message={fieldErrors.company} />
                </div>

                <div className="lg:col-span-5">
                  <label htmlFor="manual-job-source-url" className={labelClassName}>
                    <HugeiconsIcon icon={LinkSquare01Icon} size={13} color="currentColor" strokeWidth={2} />
                    원문 URL
                  </label>
                  <input
                    id="manual-job-source-url"
                    type="text"
                    inputMode="url"
                    value={form.sourceUrl}
                    onChange={(event) => setField("sourceUrl", event.target.value)}
                    placeholder="https://..."
                    className={`${inputClassName} ${fieldErrors.sourceUrl ? "border-red-300" : "border-gray-200"}`}
                    disabled={isPending}
                  />
                  <FieldError message={fieldErrors.sourceUrl} />
                </div>

                <div className="lg:col-span-3">
                  <label htmlFor="manual-job-location" className={labelClassName}>
                    <HugeiconsIcon icon={Location01Icon} size={13} color="currentColor" strokeWidth={2} />
                    지역
                  </label>
                  <input
                    id="manual-job-location"
                    type="text"
                    value={form.location}
                    onChange={(event) => setField("location", event.target.value)}
                    placeholder="서울"
                    className={`${inputClassName} ${fieldErrors.location ? "border-red-300" : "border-gray-200"}`}
                    disabled={isPending}
                  />
                  <FieldError message={fieldErrors.location} />
                </div>

                <div className="lg:col-span-3">
                  <label htmlFor="manual-job-deadline" className={labelClassName}>
                    <HugeiconsIcon icon={Calendar03Icon} size={13} color="currentColor" strokeWidth={2} />
                    마감일
                  </label>
                  <input
                    id="manual-job-deadline"
                    type="date"
                    value={form.deadline}
                    onChange={(event) => setField("deadline", event.target.value)}
                    className={`${inputClassName} ${fieldErrors.deadline ? "border-red-300" : "border-gray-200"}`}
                    disabled={isPending}
                  />
                  <FieldError message={fieldErrors.deadline} />
                </div>

                <div className="flex items-end lg:col-span-6">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-periwinkle-600 px-5 text-sm font-bold leading-none text-white transition-colors hover:bg-periwinkle-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    <HugeiconsIcon icon={Add01Icon} size={15} color="currentColor" strokeWidth={2} />
                    {isPending ? "저장 중..." : "공고 추가하기"}
                  </button>

                  {successMessage && (
                    <p className="ml-3 hidden items-center gap-1.5 text-xs font-bold text-emerald-600 sm:inline-flex">
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} color="currentColor" strokeWidth={2} />
                      {successMessage}
                    </p>
                  )}
                  {errorMessage && (
                    <p className="ml-3 hidden items-center gap-1.5 text-xs font-bold text-red-600 sm:inline-flex">
                      <HugeiconsIcon icon={AlertCircleIcon} size={14} color="currentColor" strokeWidth={2} />
                      {errorMessage}
                    </p>
                  )}
                </div>

                {(successMessage || errorMessage) && (
                  <div
                    className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold sm:hidden lg:col-span-12 ${
                      successMessage
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    <HugeiconsIcon
                      icon={successMessage ? CheckmarkCircle01Icon : AlertCircleIcon}
                      size={15}
                      color="currentColor"
                      strokeWidth={2}
                    />
                    {successMessage ?? errorMessage}
                  </div>
                )}
              </form>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
