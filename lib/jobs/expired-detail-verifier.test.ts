/**
 * 텍스트 마감 공고 상세 검증기의 사이트별 판정과 삭제 흐름을 검증한다.
 */
import { describe, expect, it, vi } from "vitest";
import {
  buildExpiredDetailVerificationUrl,
  checkJobDetailExpired,
  compareExpiredDetailCandidates,
  isExpiredDetailVerificationCandidate,
  isJobkoreaExpiredStatus,
  isMediajobExpiredHtml,
  isSaraminExpiredHtml,
  removeExpiredDetailJobs,
  touchExpiredDetailJobs,
  toSaraminCanonicalDetailUrl,
  verifyExpiredDetailCandidates,
  type ExpiredDetailCandidate,
} from "./expired-detail-verifier";

const makeCandidate = (
  overrides: Partial<ExpiredDetailCandidate> & { id: string; source_url: string }
): ExpiredDetailCandidate => ({
  id: overrides.id,
  source: overrides.source ?? "mediajob_reporter",
  source_url: overrides.source_url,
  status: overrides.status ?? "pending",
  published_at: overrides.published_at ?? null,
  last_seen_at: overrides.last_seen_at ?? null,
  detail_verified_at: overrides.detail_verified_at ?? null,
  deadline: overrides.deadline ?? "채용시까지",
});

describe("expired detail parsers", () => {
  it("detects Saramin expired apply markup", () => {
    expect(
      isSaraminExpiredHtml('<button><span class="sri_btn_expired_apply">접수마감</span></button>')
    ).toBe(true);
    expect(isSaraminExpiredHtml("<button><span>입사지원</span></button>")).toBe(false);
  });

  it("normalizes Saramin relay URLs to canonical detail URLs", () => {
    expect(
      toSaraminCanonicalDetailUrl(
        "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=53946737#seq=0"
      )
    ).toBe("https://www.saramin.co.kr/zf_user/jobs/view?rec_idx=53946737");
  });

  it("uses the Saramin canonical detail URL for verification", () => {
    const job = makeCandidate({
      id: "saramin-1",
      source: "saramin",
      source_url: "https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=53946737#seq=0",
    });

    expect(buildExpiredDetailVerificationUrl(job)).toBe(
      "https://www.saramin.co.kr/zf_user/jobs/view?rec_idx=53946737"
    );
  });

  it("detects MediaJob expired apply text", () => {
    const html = `
      <dl id="tab02">
        <dd class="rcmd_ap_way bottom">
          <div><span>마감된 공고입니다.</span></div>
        </dd>
      </dl>
    `;

    expect(isMediajobExpiredHtml(html)).toBe(true);
    expect(isMediajobExpiredHtml("<dl id=\"tab02\"><dd></dd></dl>")).toBe(false);
  });

  it("treats JobKorea 404 as expired", () => {
    expect(isJobkoreaExpiredStatus(404)).toBe(true);
    expect(isJobkoreaExpiredStatus(200)).toBe(false);
  });

  it("checks JobKorea detail availability by status", async () => {
    const expired = await checkJobDetailExpired(
      makeCandidate({
        id: "jobkorea-1",
        source: "jobkorea",
        source_url: "https://www.jobkorea.co.kr/Recruit/GI_Read/39763938",
      }),
      async () => new Response("", { status: 404 })
    );
    const active = await checkJobDetailExpired(
      makeCandidate({
        id: "jobkorea-2",
        source: "jobkorea",
        source_url: "https://www.jobkorea.co.kr/Recruit/GI_Read/49258289",
      }),
      async () => new Response("<html></html>", { status: 200 })
    );

    expect(expired.state).toBe("expired");
    expect(active.state).toBe("active");
  });

  it("includes non-ISO, approved, or published jobs and excludes pending ISO jobs", () => {
    expect(
      isExpiredDetailVerificationCandidate(
        makeCandidate({ id: "text", source_url: "https://example.com/text", deadline: "채용시까지" })
      )
    ).toBe(true);
    expect(
      isExpiredDetailVerificationCandidate(
        makeCandidate({
          id: "pending-iso",
          source_url: "https://example.com/iso",
          deadline: "2026-12-31",
        })
      )
    ).toBe(false);
    expect(
      isExpiredDetailVerificationCandidate(
        makeCandidate({
          id: "approved-iso",
          source_url: "https://example.com/approved",
          status: "approved",
          deadline: "2026-12-31",
        })
      )
    ).toBe(true);
    expect(
      isExpiredDetailVerificationCandidate(
        makeCandidate({
          id: "published",
          source_url: "https://example.com/published",
          deadline: "2026-12-31",
          published_at: "2026-05-27T00:00:00.000Z",
        })
      )
    ).toBe(true);
  });

  it("sorts never-verified candidates before older verified candidates", () => {
    const ordered = [
      makeCandidate({
        id: "newer",
        source_url: "https://example.com/newer",
        detail_verified_at: "2026-05-27T00:00:00.000Z",
      }),
      makeCandidate({
        id: "never",
        source_url: "https://example.com/never",
        last_seen_at: "2026-05-26T00:00:00.000Z",
      }),
      makeCandidate({
        id: "older",
        source_url: "https://example.com/older",
        detail_verified_at: "2026-05-26T00:00:00.000Z",
      }),
    ].sort(compareExpiredDetailCandidates);

    expect(ordered.map((job) => job.id)).toEqual(["never", "older", "newer"]);
  });
});

describe("verifyExpiredDetailCandidates", () => {
  it("removes only expired jobs and keeps fetch errors in the result", async () => {
    const candidates = [
      makeCandidate({
        id: "expired",
        source_url: "https://www.mediajob.co.kr/recruit/recruit.htm?cmd=view&rec_idx=1",
      }),
      makeCandidate({
        id: "active",
        source_url: "https://www.mediajob.co.kr/recruit/recruit.htm?cmd=view&rec_idx=2",
      }),
      makeCandidate({
        id: "failed",
        source_url: "https://www.mediajob.co.kr/recruit/recruit.htm?cmd=view&rec_idx=3",
      }),
    ];
    const removed: ExpiredDetailCandidate[] = [];
    const touched: ExpiredDetailCandidate[] = [];
    const fetcher = vi.fn(async (input: string) => {
      if (input.endsWith("rec_idx=1")) {
        return new Response(
          '<dl id="tab02"><dd class="rcmd_ap_way bottom"><div><span>마감된 공고입니다.</span></div></dd></dl>',
          { status: 200 }
        );
      }
      if (input.endsWith("rec_idx=2")) {
        return new Response(
          '<dl id="tab02"><dd class="rcmd_ap_way bottom"><div><span>이메일 지원</span></div></dd></dl>',
          { status: 200 }
        );
      }
      throw new Error("network down");
    });

    const result = await verifyExpiredDetailCandidates(candidates, {
      fetcher,
      concurrency: 2,
      removeExpired: async (jobs) => {
        removed.push(...jobs);
        return { blocked: jobs.length, deleted: jobs.length };
      },
      touchVerified: async (jobs) => {
        touched.push(...jobs);
        return jobs.length;
      },
    });

    expect(result.success).toBe(true);
    expect(result.checked).toBe(3);
    expect(result.deleted).toBe(1);
    expect(result.blocked).toBe(1);
    expect(result.verified).toBe(2);
    expect(result.skipped).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(removed.map((job) => job.id)).toEqual(["expired"]);
    expect(touched.map((job) => job.id)).toEqual(["active", "failed"]);
  });
});

describe("removeExpiredDetailJobs", () => {
  it("blocks source URLs before deleting job rows", async () => {
    const calls: string[] = [];
    const supabase = {
      from(table: string) {
        if (table === "crawl_blocked_source_urls") {
          return {
            upsert: async (rows: unknown[]) => {
              calls.push(`block:${rows.length}`);
              return { error: null };
            },
          };
        }
        return {
          delete: () => ({
            in: async (_column: string, values: unknown[]) => {
              calls.push(`delete:${values.length}`);
              return { error: null };
            },
          }),
        };
      },
    } as unknown as Parameters<typeof removeExpiredDetailJobs>[0];

    const result = await removeExpiredDetailJobs(supabase, [
      makeCandidate({ id: "job-1", source_url: "https://example.com/1" }),
      makeCandidate({ id: "job-2", source_url: "https://example.com/2" }),
    ]);

    expect(result).toEqual({ blocked: 2, deleted: 2 });
    expect(calls).toEqual(["block:2", "delete:2"]);
  });

  it("updates detail verification time for non-expired rows", async () => {
    const calls: unknown[] = [];
    const supabase = {
      from() {
        return {
          update: (payload: unknown) => ({
            in: async (_column: string, values: unknown[]) => {
              calls.push(payload, values);
              return { error: null };
            },
          }),
        };
      },
    } as unknown as Parameters<typeof touchExpiredDetailJobs>[0];

    const touched = await touchExpiredDetailJobs(
      supabase,
      [
        makeCandidate({ id: "job-1", source_url: "https://example.com/1" }),
        makeCandidate({ id: "job-2", source_url: "https://example.com/2" }),
      ],
      "2026-05-27T00:00:00.000Z"
    );

    expect(touched).toBe(2);
    expect(calls).toEqual([
      { detail_verified_at: "2026-05-27T00:00:00.000Z" },
      ["job-1", "job-2"],
    ]);
  });
});
