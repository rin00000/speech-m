import { describe, expect, it, vi } from "vitest";
import {
  JOBS_PAGE_SIZE,
  getAdminJobsListData,
  getPublicJobsListData,
  parseJobsListParams,
  type JobListItem,
  type PublicJobListItem,
} from "./listing-data";

describe("parseJobsListParams", () => {
  it("normalizes filters, page, and search query", () => {
    expect(
      parseJobsListParams({
        status: "approved",
        source: "saramin",
        showRejected: "1",
        page: "2",
        q: "  reporter   job  ",
      }),
    ).toMatchObject({
      activeStatus: "approved",
      activeSource: "saramin",
      showRejected: true,
      page: 2,
      query: "reporter job",
      hideRejectedInList: false,
    });
  });

  it("falls back to the default listing state for invalid params", () => {
    expect(
      parseJobsListParams({
        status: "archived",
        source: "unknown",
        page: "-3",
      }),
    ).toMatchObject({
      activeStatus: null,
      activeSource: null,
      showRejected: false,
      page: 1,
      query: "",
      hideRejectedInList: true,
    });
  });
});

describe("getAdminJobsListData", () => {
  it("loads only the requested server page with filters and facet counts", async () => {
    const job = makeAdminJob({ id: "job-1", status: "approved", source: "saramin" });
    const { client, queries, rpc } = createSupabaseMock({
      queryResults: [{ data: [job], count: 16, error: null }],
      rpcData: [
        { kind: "status", key: "all", count: 16 },
        { kind: "status", key: "approved", count: 7 },
        { kind: "source", key: "all", count: 16 },
        { kind: "source", key: "saramin", count: 3 },
      ],
    });
    const params = parseJobsListParams({
      status: "approved",
      source: "saramin",
      showRejected: "1",
      page: "2",
      q: "anchor",
    });

    const result = await getAdminJobsListData({ supabase: client as never, params });

    expect(result.jobs).toEqual([job]);
    expect(result.pagination).toMatchObject({
      currentPage: 2,
      totalPages: 2,
      totalCount: 16,
      visibleStart: 16,
      visibleEnd: 16,
      pageSize: JOBS_PAGE_SIZE,
    });
    expect(result.statusCounts.approved).toBe(7);
    expect(result.sourceCounts.saramin).toBe(3);
    expect(queries[0].eq).toHaveBeenCalledWith("status", "approved");
    expect(queries[0].eq).toHaveBeenCalledWith("source", "saramin");
    expect(queries[0].range).toHaveBeenCalledWith(15, 29);
    expect(rpc).toHaveBeenCalledWith("get_job_posting_facets", {
      p_today_iso: expect.any(String),
      p_status: "approved",
      p_source: "saramin",
      p_show_rejected: true,
      p_query: "anchor",
    });
  });

  it("corrects an out-of-range page without returning an empty page", async () => {
    const job = makeAdminJob({ id: "job-16" });
    const { client } = createSupabaseMock({
      queryResults: [
        { data: [], count: 16, error: null },
        { data: [job], count: 16, error: null },
      ],
      rpcData: [],
    });
    const params = parseJobsListParams({ page: "3" });

    const result = await getAdminJobsListData({ supabase: client as never, params });

    expect(result.jobs).toEqual([job]);
    expect(result.pagination.currentPage).toBe(2);
    expect(result.pagination.visibleStart).toBe(16);
    expect(client.from).toHaveBeenCalledTimes(2);
  });
});

describe("getPublicJobsListData", () => {
  it("loads approved public jobs with server pagination and search", async () => {
    const job = makePublicJob({ id: "job-public" });
    const { client, queries } = createSupabaseMock({
      queryResults: [{ data: [job], count: 1, error: null }],
      rpcData: [],
    });
    const params = parseJobsListParams({ q: "weather" });

    const result = await getPublicJobsListData({
      supabase: client as never,
      params: { page: params.page, query: params.query },
    });

    expect(result.jobs).toEqual([job]);
    expect(result.pagination.totalCount).toBe(1);
    expect(queries[0].eq).toHaveBeenCalledWith("status", "approved");
    expect(queries[0].or).toHaveBeenCalledWith(
      expect.stringContaining("title.ilike.%weather%"),
    );
    expect(queries[0].range).toHaveBeenCalledWith(0, 14);
  });
});

type QueryResult<T> = {
  data: T[];
  count: number | null;
  error: { message: string } | null;
};

function createSupabaseMock({
  queryResults,
  rpcData,
}: {
  queryResults: QueryResult<unknown>[];
  rpcData: unknown[];
}) {
  const queries: ReturnType<typeof createQueryMock>[] = [];
  const pendingResults = [...queryResults];
  const rpc = vi.fn().mockResolvedValue({ data: rpcData, error: null });
  const client = {
    from: vi.fn(() => {
      const result = pendingResults.shift();
      if (!result) throw new Error("Unexpected job_postings query");
      const query = createQueryMock(result);
      queries.push(query);
      return query;
    }),
    rpc,
  };

  return { client, queries, rpc };
}

function createQueryMock(result: QueryResult<unknown>) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    returns: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.neq.mockReturnValue(query);
  query.or.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.range.mockReturnValue(query);
  query.returns.mockReturnValue(Promise.resolve(result));

  return query;
}

function makeAdminJob(overrides: Partial<JobListItem> = {}): JobListItem {
  return {
    id: "job-1",
    title: "Announcer",
    company: "Speech M",
    location: "Seoul",
    source: "custom",
    source_url: "https://example.com/job",
    deadline: null,
    status: "pending",
    published_at: null,
    created_at: "2026-07-01T00:00:00.000Z",
    ai_fit_snapshot: null,
    ...overrides,
  };
}

function makePublicJob(overrides: Partial<PublicJobListItem> = {}): PublicJobListItem {
  return {
    id: "job-public",
    title: "Reporter",
    company: "Speech M",
    location: "Seoul",
    deadline: null,
    source_url: "https://example.com/job",
    published_at: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}
