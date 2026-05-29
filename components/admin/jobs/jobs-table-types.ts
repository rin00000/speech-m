/**
 * 공고 테이블과 하위 컴포넌트가 공유하는 타입과 표시 옵션.
 * DB row 타입은 이 파일에서만 별칭으로 만들고 UI 파일들은 JobPosting을 재사용한다.
 */

import type { ReactNode } from "react";
import type { Database } from "@/types/database.types";

export type JobPosting = Database["public"]["Tables"]["job_postings"]["Row"];
export type JobsTableDensity = "compact" | "comfortable";

export type JobsTableProps = {
  jobs: JobPosting[];
  /** AI 적합도 스냅샷 사유 컬럼 표시 */
  showAiRejectReasons?: boolean;
  sourceHeader?: ReactNode;
  emptyState?: ReactNode;
};

export const JOBS_PAGE_SIZE = 15;
