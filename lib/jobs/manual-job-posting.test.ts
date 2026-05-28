import { describe, expect, it } from "vitest";
import { buildManualJobPostingPayload, normalizeManualJobUrl } from "./manual-job-posting";

const TODAY = new Date("2026-05-28T00:00:00.000Z");

const validInput = {
  title: "아나운서 채용",
  company: "Speech 방송",
  sourceUrl: "https://example.com/jobs/1",
  location: "서울",
  deadline: "2026-05-29",
};

describe("manual job posting", () => {
  it("rejects missing required fields", () => {
    const result = buildManualJobPostingPayload(
      {
        title: "",
        company: "",
        sourceUrl: "",
      },
      TODAY
    );

    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected validation failure");
    expect(result.fieldErrors.title).toBe("공고명을 입력해 주세요.");
    expect(result.fieldErrors.company).toBe("회사명을 입력해 주세요.");
    expect(result.fieldErrors.sourceUrl).toBe("원문 URL을 입력해 주세요.");
  });

  it("rejects unsupported URL schemes", () => {
    const result = buildManualJobPostingPayload(
      {
        ...validInput,
        sourceUrl: "ftp://example.com/jobs/1",
      },
      TODAY
    );

    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected URL validation failure");
    expect(result.fieldErrors.sourceUrl).toBe("원문 URL은 http 또는 https 주소만 입력할 수 있습니다.");
  });

  it("normalizes URLs without a protocol to https", () => {
    expect(normalizeManualJobUrl("example.com/jobs/1")).toBe("https://example.com/jobs/1");
  });

  it("rejects past deadlines", () => {
    const result = buildManualJobPostingPayload(
      {
        ...validInput,
        deadline: "2026-05-27",
      },
      TODAY
    );

    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected deadline validation failure");
    expect(result.fieldErrors.deadline).toBe("마감일은 오늘 이후 날짜로 입력해 주세요.");
  });

  it("builds an approved custom insert payload", () => {
    const result = buildManualJobPostingPayload(
      {
        title: "  Announcer   Hire  ",
        company: " KBS  ",
        sourceUrl: "example.com/jobs/announcer",
        location: "",
        deadline: "",
      },
      TODAY
    );

    expect(result.success).toBe(true);
    if (!result.success) throw new Error(result.error);
    expect(result.payload).toMatchObject({
      title: "Announcer   Hire",
      company: "KBS",
      location: null,
      source: "custom",
      source_url: "https://example.com/jobs/announcer",
      status: "approved",
      deadline: null,
      published_at: null,
      rejected_at: null,
      ai_fit_snapshot: null,
      fingerprint: "kbs|announcer hire",
    });
  });
});
