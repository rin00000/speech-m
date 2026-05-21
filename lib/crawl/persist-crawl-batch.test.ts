import { describe, expect, it } from "vitest";
import { splitJobsByExistingSourceUrl } from "@/lib/crawl/persist-crawl-batch";
import type { ExistingJobPostingRow } from "@/lib/crawl/crawl-db-lookup";
import type { JobInsert } from "@/lib/crawl/shared";

const makeJob = (overrides: Partial<JobInsert> & { source_url: string }): JobInsert => ({
  title: "테스트 공고",
  company: "테스트 회사",
  location: "서울",
  source: "mediajob_announcer",
  status: "pending",
  deadline: null,
  ...overrides,
});

const makeExisting = (
  overrides: Partial<ExistingJobPostingRow> & { id: string; source_url: string }
): ExistingJobPostingRow => ({
  title: "기존 공고",
  company: "기존 회사",
  location: "서울",
  deadline: "2026-12-31",
  fingerprint: "기존 회사|기존 공고",
  status: "pending",
  ...overrides,
});

describe("splitJobsByExistingSourceUrl", () => {
  it("source_url이 일치하는 기존 행은 fingerprint·title이 같아도 메타 갱신 대상으로 분리한다", () => {
    const incoming = makeJob({
      source_url: "https://example.com/jobs/1",
      title: "기존 공고",
      company: "기존 회사",
      deadline: "2027-01-15",
    });
    const existing = makeExisting({
      id: "job-1",
      source_url: "https://example.com/jobs/1",
      deadline: "2026-12-31",
    });

    const result = splitJobsByExistingSourceUrl(
      [incoming],
      new Map([[existing.source_url, existing]])
    );

    expect(result.existing).toHaveLength(1);
    expect(result.existing[0]?.existing.id).toBe("job-1");
    expect(result.existing[0]?.incoming.deadline).toBe("2027-01-15");
    expect(result.fresh).toHaveLength(0);
  });

  it("DB에 없는 source_url은 신규 후보로 분리한다", () => {
    const incoming = makeJob({ source_url: "https://example.com/jobs/2" });

    const result = splitJobsByExistingSourceUrl([incoming], new Map());

    expect(result.existing).toHaveLength(0);
    expect(result.fresh).toEqual([incoming]);
  });

  it("기존·신규를 한 배치에서 동시에 분리한다", () => {
    const stayingJob = makeJob({
      source_url: "https://example.com/jobs/a",
      deadline: "2027-01-15",
    });
    const newJob = makeJob({ source_url: "https://example.com/jobs/b" });
    const existing = makeExisting({
      id: "job-a",
      source_url: "https://example.com/jobs/a",
    });

    const result = splitJobsByExistingSourceUrl(
      [stayingJob, newJob],
      new Map([[existing.source_url, existing]])
    );

    expect(result.existing.map((e) => e.existing.id)).toEqual(["job-a"]);
    expect(result.fresh).toEqual([newJob]);
  });
});
