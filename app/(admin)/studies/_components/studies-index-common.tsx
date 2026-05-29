/**
 * /studies 목록 화면에서 공유하는 작은 표시 컴포넌트와 날짜 포맷 유틸리티.
 * 역할별 화면 파일이 입력/빈 상태/지표 표현을 중복하지 않도록 모아둔다.
 */

import type { InputHTMLAttributes } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { BookOpen01Icon } from "@hugeicons/core-free-icons";

export function TextInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 placeholder:text-gray-400 focus:border-periwinkle-300 ${className}`}
    />
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-2 py-2">
      <p className="text-base font-extrabold leading-none text-gray-900">{value}</p>
      <p className="mt-1 text-[10px] font-bold leading-none text-gray-400">{label}</p>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center shadow-sm md:rounded-3xl">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-gray-400">
        <HugeiconsIcon icon={BookOpen01Icon} size={26} color="currentColor" />
      </span>
      <p className="mt-4 text-sm font-extrabold text-gray-700">{title}</p>
      <p className="mt-1 text-xs font-medium text-gray-400">{description}</p>
    </div>
  );
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}
