/**
 * job-fit 배치가 규칙 기반 판별과 LLM 판별을 단계적으로 분리해 처리하는지 검증한다.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/database.types";
import { runJobFitBatch } from "./batch";
import { JobFitProviderHttpError } from "./providers";

const { mockCreateAdminClient, mockEvaluateByPriority } = vi.hoisted(() => ({
  mockCreateAdminClient: vi.fn(),
  mockEvaluateByPriority: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

vi.mock("./providers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./providers")>();
  return {
    ...actual,
    evaluateByPriority: mockEvaluateByPriority,
  };
});

type JobPosting = Database["public"]["Tables"]["job_postings"]["Row"];
type JobPostingUpdate = Database["public"]["Tables"]["job_postings"]["Update"];

const makeJob = (overrides: Partial<JobPosting>): JobPosting => ({
  id: "job-id",
  title: "테스트 공고",
  company: "테스트 회사",
  location: null,
  source: "custom",
  source_url: "https://example.com/job",
  status: "pending",
  deadline: null,
  published_at: null,
  rejected_at: null,
  created_at: "2026-06-06T00:00:00.000Z",
  fingerprint: null,
  last_seen_at: null,
  detail_verified_at: null,
  ai_fit_snapshot: null,
  ...overrides,
});

const makeSupabase = (jobs: JobPosting[]) => {
  const updates: Array<{ id: string; row: JobPostingUpdate }> = [];

  const supabase = {
    from: vi.fn(() => {
      const state: {
        operation: "select" | "update";
        row: JobPostingUpdate | null;
        id: string | null;
      } = {
        operation: "select",
        row: null,
        id: null,
      };

      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((column: string, value: string) => {
          if (column === "id") state.id = value;
          return builder;
        }),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        update: vi.fn((row: JobPostingUpdate) => {
          state.operation = "update";
          state.row = row;
          return builder;
        }),
        returns: vi.fn(async () => {
          if (state.operation === "update") {
            updates.push({ id: state.id ?? "", row: state.row ?? {} });
            return { data: [{ id: state.id }], error: null };
          }

          return { data: jobs, error: null };
        }),
      };

      return builder;
    }),
  };

  return { supabase, updates };
};

describe("runJobFitBatch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.JOB_FIT_BATCH_CONCURRENCY;
    delete process.env.JOB_FIT_DB_UPDATE_CONCURRENCY;
  });

  it("deterministic decisions skip Gemini and only unresolved jobs call LLM", async () => {
    const deterministicJob = makeJob({
      id: "deterministic-reject",
      title: "AD 모집",
      company: "테스트 회사",
    });
    const llmJob = makeJob({
      id: "llm-approve",
      title: "테스트 공고",
      company: "테스트 회사",
    });
    const { supabase, updates } = makeSupabase([deterministicJob, llmJob]);
    mockCreateAdminClient.mockReturnValue(supabase);
    mockEvaluateByPriority.mockResolvedValue({
      model: "gemini-test",
      parsed: {
        label: "approved",
        score: 72,
        reasons: ["LLM approved."],
        matched_rules: ["llm_rule"],
      },
      rawText: "{}",
    });

    const result = await runJobFitBatch(30);

    expect(mockEvaluateByPriority).toHaveBeenCalledTimes(1);
    expect(mockEvaluateByPriority).toHaveBeenCalledWith(
      expect.objectContaining({ id: "llm-approve" })
    );
    expect(result).toMatchObject({
      success: true,
      scanned: 2,
      approved: 1,
      rejected: 1,
      failed: 0,
      skipped: 0,
    });
    expect(updates).toHaveLength(2);
    expect(updates.find((u) => u.id === "deterministic-reject")?.row.status).toBe(
      "rejected"
    );
    expect(updates.find((u) => u.id === "llm-approve")?.row.status).toBe("approved");
  });

  it("stops remaining LLM work after Gemini 429 and preserves the queue", async () => {
    const jobs = [
      makeJob({ id: "llm-1", title: "테스트 공고 1" }),
      makeJob({ id: "llm-2", title: "테스트 공고 2" }),
      makeJob({ id: "llm-3", title: "테스트 공고 3" }),
    ];
    const { supabase, updates } = makeSupabase(jobs);
    mockCreateAdminClient.mockReturnValue(supabase);
    mockEvaluateByPriority.mockRejectedValue(new JobFitProviderHttpError("Gemini", 429));

    const result = await runJobFitBatch(30);

    expect(mockEvaluateByPriority).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      success: false,
      scanned: 3,
      failed: 1,
      skipped: 2,
      error: "Gemini API failed: HTTP 429",
    });
    expect(updates).toHaveLength(0);
  });
});
