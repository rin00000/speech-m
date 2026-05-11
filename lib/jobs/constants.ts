import type { JobSource, JobStatus } from "@/types/database.types";

export const SOURCE_LABEL: Record<JobSource, string> = {
  mediajob_announcer: "아나운서",
  mediajob_reporter: "기자",
  mediajob_intern: "인턴",
  saramin: "사람인",
  jobkorea: "잡코리아",
  arang: "아랑카페",
  custom: "직접입력",
};

export const STATUS_STYLE: Record<JobStatus, { label: string; className: string }> = {
  pending: {
    label: "검토 중",
    className: "bg-amber-50 text-amber-600 ring-amber-200",
  },
  approved: {
    label: "승인됨",
    className: "bg-emerald-50 text-emerald-600 ring-emerald-200",
  },
  rejected: {
    label: "거절됨",
    className: "bg-red-50 text-red-500 ring-red-200",
  },
};
