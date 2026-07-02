/**
 * /jobs 목록 화면의 필터 파싱, 서버 페이지네이션, 집계 조회를 담당합니다.
 * 관리자/공개 목록이 동일한 URL 검색어 규칙을 쓰도록 데이터 로딩 책임을 모읍니다.
 */

import { activeDeadlineOrExpression, getTodayIso } from "@/lib/jobs/deadline";
import type { Database, JobSource, JobStatus } from "@/types/database.types";

type JobPostingRow = Database["public"]["Tables"]["job_postings"]["Row"];

export type JobListItem = Pick<
  JobPostingRow,
  | "id"
  | "title"
  | "company"
  | "location"
  | "source"
  | "source_url"
  | "deadline"
  | "status"
  | "published_at"
  | "created_at"
  | "ai_fit_snapshot"
>;

export type PublicJobListItem = Pick<
  JobPostingRow,
  "id" | "title" | "company" | "location" | "deadline" | "source_url" | "published_at"
>;

export type JobPostingFacetRow = {
  kind: "status" | "source";
  key: string;
  count: number;
};

export type JobsListSearchParams = {
  status?: string;
  source?: string;
  showRejected?: string;
  page?: string;
  q?: string;
};

export type ParsedJobsListParams = {
  activeStatus: JobStatus | null;
  activeSource: JobSource | null;
  showRejected: boolean;
  page: number;
  query: string;
  hideRejectedInList: boolean;
};

export type JobsPagination = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  visibleStart: number;
  visibleEnd: number;
  pageSize: number;
};

export type AdminJobsListData = {
  jobs: JobListItem[];
  statusCounts: Record<"all" | JobStatus, number>;
  sourceCounts: Record<"all" | JobSource, number>;
  workQueueCount: number;
  pagination: JobsPagination;
};

export type PublicJobsListData = {
  jobs: PublicJobListItem[];
  pagination: JobsPagination;
};

const JOB_LIST_SELECT =
  "id,title,company,location,source,source_url,deadline,status,published_at,created_at,ai_fit_snapshot";
const PUBLIC_JOB_LIST_SELECT =
  "id,title,company,location,deadline,source_url,published_at";

export const JOBS_PAGE_SIZE = 15;

export const VALID_JOB_STATUSES = ["pending", "approved", "rejected"] as const;
export const VALID_JOB_SOURCES = [
  "mediajob_announcer",
  "mediajob_reporter",
  "mediajob_intern",
  "saramin",
  "jobkorea",
  "arang",
  "custom",
] as const;

export const initialSourceCounts = (): Record<"all" | JobSource, number> => ({
  all: 0,
  mediajob_announcer: 0,
  mediajob_reporter: 0,
  mediajob_intern: 0,
  saramin: 0,
  jobkorea: 0,
  arang: 0,
  custom: 0,
});

export const initialStatusCounts = (): Record<"all" | JobStatus, number> => ({
  all: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
});

export function parseJobsListParams(
  searchParams: JobsListSearchParams | undefined
): ParsedJobsListParams {
  const activeStatus = VALID_JOB_STATUSES.includes(searchParams?.status as JobStatus)
    ? (searchParams?.status as JobStatus)
    : null;
  const activeSource = VALID_JOB_SOURCES.includes(searchParams?.source as JobSource)
    ? (searchParams?.source as JobSource)
    : null;
  const showRejected = searchParams?.showRejected === "1";
  const rawPage = Number.parseInt(searchParams?.page ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const query = normalizeJobSearchQuery(searchParams?.q ?? "");

  return {
    activeStatus,
    activeSource,
    showRejected,
    page,
    query,
    hideRejectedInList: activeStatus === null && !showRejected,
  };
}

export function buildPagination({
  page,
  totalCount,
  pageSize = JOBS_PAGE_SIZE,
  itemCount,
}: {
  page: number;
  totalCount: number;
  pageSize?: number;
  itemCount: number;
}): JobsPagination {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const visibleStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const visibleEnd = totalCount === 0 ? 0 : visibleStart + itemCount - 1;

  return {
    currentPage,
    totalPages,
    totalCount,
    visibleStart,
    visibleEnd,
    pageSize,
  };
}

export async function getAdminJobsListData({
  supabase,
  params,
}: {
  supabase: ReturnType<typeof import("@/lib/supabase/server").createAdminClient>;
  params: ParsedJobsListParams;
}): Promise<AdminJobsListData> {
  const requestedPageOffset = (params.page - 1) * JOBS_PAGE_SIZE;
  const query = applyAdminJobFilters(
    supabase
      .from("job_postings")
      .select(JOB_LIST_SELECT, { count: "exact" })
      .or(activeDeadlineOrExpression())
      .order("created_at", { ascending: false }),
    params
  )
    .range(requestedPageOffset, requestedPageOffset + JOBS_PAGE_SIZE - 1)
    .returns<JobListItem[]>();

  const [jobsResult, facetCounts] = await Promise.all([
    query,
    getJobPostingFacetCounts({ supabase, params }),
  ]);

  const jobs = jobsResult.data ?? [];
  const totalCount = jobsResult.count ?? jobs.length;
  const pagination = buildPagination({
    page: params.page,
    totalCount,
    itemCount: jobs.length,
  });

  if (params.page !== pagination.currentPage && totalCount > 0) {
    const correctedOffset = (pagination.currentPage - 1) * JOBS_PAGE_SIZE;
    const correctedResult = await applyAdminJobFilters(
      supabase
        .from("job_postings")
        .select(JOB_LIST_SELECT, { count: "exact" })
        .or(activeDeadlineOrExpression())
        .order("created_at", { ascending: false }),
      params
    )
      .range(correctedOffset, correctedOffset + JOBS_PAGE_SIZE - 1)
      .returns<JobListItem[]>();

    return {
      jobs: correctedResult.data ?? [],
      statusCounts: facetCounts.statusCounts,
      sourceCounts: facetCounts.sourceCounts,
      workQueueCount: facetCounts.statusCounts.pending + facetCounts.statusCounts.approved,
      pagination: buildPagination({
        page: pagination.currentPage,
        totalCount: correctedResult.count ?? totalCount,
        itemCount: correctedResult.data?.length ?? 0,
      }),
    };
  }

  return {
    jobs,
    statusCounts: facetCounts.statusCounts,
    sourceCounts: facetCounts.sourceCounts,
    workQueueCount: facetCounts.statusCounts.pending + facetCounts.statusCounts.approved,
    pagination,
  };
}

export async function getPublicJobsListData({
  supabase,
  params,
}: {
  supabase: ReturnType<typeof import("@/lib/supabase/server").createAdminClient>;
  params: Pick<ParsedJobsListParams, "page" | "query">;
}): Promise<PublicJobsListData> {
  const requestedPageOffset = (params.page - 1) * JOBS_PAGE_SIZE;
  const query = applyJobSearchFilter(
    supabase
      .from("job_postings")
      .select(PUBLIC_JOB_LIST_SELECT, { count: "exact" })
      .eq("status", "approved")
      .or(activeDeadlineOrExpression())
      .order("published_at", { ascending: false }),
    params.query
  )
    .range(requestedPageOffset, requestedPageOffset + JOBS_PAGE_SIZE - 1)
    .returns<PublicJobListItem[]>();

  const result = await query;
  const jobs = result.data ?? [];
  const totalCount = result.count ?? jobs.length;
  const pagination = buildPagination({
    page: params.page,
    totalCount,
    itemCount: jobs.length,
  });

  if (params.page !== pagination.currentPage && totalCount > 0) {
    const correctedOffset = (pagination.currentPage - 1) * JOBS_PAGE_SIZE;
    const correctedResult = await applyJobSearchFilter(
      supabase
        .from("job_postings")
        .select(PUBLIC_JOB_LIST_SELECT, { count: "exact" })
        .eq("status", "approved")
        .or(activeDeadlineOrExpression())
        .order("published_at", { ascending: false }),
      params.query
    )
      .range(correctedOffset, correctedOffset + JOBS_PAGE_SIZE - 1)
      .returns<PublicJobListItem[]>();

    return {
      jobs: correctedResult.data ?? [],
      pagination: buildPagination({
        page: pagination.currentPage,
        totalCount: correctedResult.count ?? totalCount,
        itemCount: correctedResult.data?.length ?? 0,
      }),
    };
  }

  return { jobs, pagination };
}

async function getJobPostingFacetCounts({
  supabase,
  params,
}: {
  supabase: ReturnType<typeof import("@/lib/supabase/server").createAdminClient>;
  params: ParsedJobsListParams;
}) {
  const statusCounts = initialStatusCounts();
  const sourceCounts = initialSourceCounts();
  const { data, error } = await supabase.rpc("get_job_posting_facets", {
    p_today_iso: getTodayIso(),
    p_status: params.activeStatus,
    p_source: params.activeSource,
    p_show_rejected: params.showRejected,
    p_query: params.query || null,
  });

  if (error) {
    console.error("[jobs] get_job_posting_facets failed", error);
    return { statusCounts, sourceCounts };
  }

  for (const row of (data ?? []) as JobPostingFacetRow[]) {
    const count = Number(row.count);
    if (!Number.isFinite(count)) continue;
    if (row.kind === "status" && isStatusCountKey(row.key)) {
      statusCounts[row.key] = count;
    }
    if (row.kind === "source" && isSourceCountKey(row.key)) {
      sourceCounts[row.key] = count;
    }
  }

  return { statusCounts, sourceCounts };
}

type JobFilterBuilder<QueryBuilder> = QueryBuilder & {
  eq: (column: string, value: string) => JobFilterBuilder<QueryBuilder>;
  neq: (column: string, value: string) => JobFilterBuilder<QueryBuilder>;
  or: (expression: string) => JobFilterBuilder<QueryBuilder>;
};

function applyAdminJobFilters<QueryBuilder>(
  query: QueryBuilder,
  params: ParsedJobsListParams
): QueryBuilder {
  let next = query as JobFilterBuilder<QueryBuilder>;
  if (params.activeStatus) next = next.eq("status", params.activeStatus);
  else if (params.hideRejectedInList) next = next.neq("status", "rejected");
  if (params.activeSource) next = next.eq("source", params.activeSource);
  return applyJobSearchFilter(next, params.query) as QueryBuilder;
}

function applyJobSearchFilter<QueryBuilder>(query: QueryBuilder, searchQuery: string): QueryBuilder {
  if (!searchQuery) return query;
  const pattern = `%${searchQuery.replace(/[%,()]/g, " ")}%`;
  return (query as JobFilterBuilder<QueryBuilder>).or(
    `title.ilike.${pattern},company.ilike.${pattern}`
  ) as QueryBuilder;
}

function normalizeJobSearchQuery(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}

function isStatusCountKey(key: string): key is "all" | JobStatus {
  return key === "all" || VALID_JOB_STATUSES.includes(key as JobStatus);
}

function isSourceCountKey(key: string): key is "all" | JobSource {
  return key === "all" || VALID_JOB_SOURCES.includes(key as JobSource);
}
