/**
 * 텍스트 마감 상세 검증 모듈에서 공유하는 타입.
 * 판정, DB mutation, 배치 실행 파일이 같은 타입 계약을 쓰도록 별도로 둔다.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type AdminClient = SupabaseClient<Database>;

export type ExpiredDetailCandidate = Pick<
  Database["public"]["Tables"]["job_postings"]["Row"],
  | "id"
  | "source"
  | "source_url"
  | "deadline"
  | "status"
  | "published_at"
  | "last_seen_at"
  | "detail_verified_at"
>;

export type ExpiredDetailCheckState = "expired" | "active" | "unknown";

export type ExpiredDetailCheckResult = {
  state: ExpiredDetailCheckState;
  checkedUrl: string;
  reason: string;
  status?: number;
};

export type ExpiredDetailVerificationError = {
  id?: string;
  sourceUrl?: string;
  message: string;
};

export type ExpiredDetailVerificationResult = {
  success: boolean;
  checked: number;
  deleted: number;
  blocked: number;
  verified: number;
  skipped: number;
  errors: ExpiredDetailVerificationError[];
  error?: string;
};

export type DetailFetch = (input: string, init?: RequestInit) => Promise<Response>;
export type ExpiredDetailRemovalResult = Pick<
  ExpiredDetailVerificationResult,
  "blocked" | "deleted"
>;
export type ExpiredDetailRemoval = (
  jobs: readonly ExpiredDetailCandidate[],
) => Promise<ExpiredDetailRemovalResult>;
export type ExpiredDetailTouch = (jobs: readonly ExpiredDetailCandidate[]) => Promise<number>;
