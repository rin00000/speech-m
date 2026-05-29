/**
 * 수강생에게 보이는 스터디 목록 카드 그리드.
 * 참여 중인 스터디 진입 흐름만 담당해 관리자 편집 UI와 분리한다.
 */

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import type { StudyListItem } from "@/lib/studies/data";
import { EmptyState, Metric, formatDate } from "./studies-index-common";

export function StudentStudiesView({ studies }: { studies: StudyListItem[] }) {
  if (studies.length === 0) {
    return (
      <EmptyState
        title="참여 중인 스터디가 없습니다"
        description="관리자가 스터디 멤버로 추가하면 이곳에 표시됩니다."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {studies.map((study) => (
        <Link
          key={study.id}
          href={`/studies/${study.id}`}
          className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-periwinkle-200 hover:bg-periwinkle-50/30 md:rounded-3xl md:p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-periwinkle-100 bg-periwinkle-50 text-periwinkle-700">
              <HugeiconsIcon icon={UserGroupIcon} size={18} color="currentColor" />
            </span>
            <span className="inline-flex items-center rounded-full border border-periwinkle-200 bg-periwinkle-50 px-2.5 py-1 text-[11px] font-bold leading-none text-periwinkle-700">
              릴레이
            </span>
          </div>

          <h2 className="mt-4 text-base font-extrabold leading-tight text-gray-900">
            {study.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug text-gray-500">
            {study.description || "이번 주 원고를 읽고 학생끼리 피드백을 이어갑니다."}
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <Metric label="멤버" value={`${study.memberCount}`} />
            <Metric label="진행" value={`${study.openQuestCount}`} />
            <Metric label="전체" value={`${study.questCount}`} />
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-xs font-bold text-gray-500">
            <span>
              {study.nextDueAt ? `${formatDate(study.nextDueAt)} 마감` : "열린 퀘스트 없음"}
            </span>
            <span className="inline-flex items-center gap-1 text-periwinkle-700">
              입장
              <HugeiconsIcon icon={ArrowRight01Icon} size={14} color="currentColor" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
