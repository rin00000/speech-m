/**
 * 관리자 `/jobs` 링크용 쿼리스트링 빌더.
 * 기본 목록은 거절을 숨기므로 `showRejected=1`로 전체(거절 포함)를 표시한다.
 */
import type { JobSource, JobStatus } from "@/types/database.types";

export type JobsAdminHrefParams = {
  status?: JobStatus | null;
  source?: JobSource | null;
  /** true이면 쿼리에 `showRejected=1`을 넣어 거절 행도 목록에 포함한다. */
  showRejected?: boolean;
};

export function buildJobsAdminHref(params: JobsAdminHrefParams = {}): string {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.source) q.set("source", params.source);
  if (params.showRejected) q.set("showRejected", "1");
  const qs = q.toString();
  return qs ? `/jobs?${qs}` : "/jobs";
}
