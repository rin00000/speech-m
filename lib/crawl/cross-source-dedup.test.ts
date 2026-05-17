import { describe, expect, it } from "vitest";
import {
  extractTitleCoreTokens,
  isCrossSourceDuplicate,
  normalizeCompanyKey,
  titleSimilarity,
} from "@/lib/crawl/cross-source-dedup";

const MASTERMIND = "(주)마스터마인드";

const TITLE_JOBKOREA =
  "[민성원연구소]교육 VOD서비스를 함께 만들어갈 성우/아나운서 조교 모집";
const TITLE_SARAMIN =
  "(주)마스터마인드 VOD콘텐츠 만들어 갈 아나운서/성우 조교모집";

describe("normalizeCompanyKey", () => {
  it("removes legal entity markers and all whitespace", () => {
    expect(normalizeCompanyKey("(주)마스터마인드")).toBe("마스터마인드");
    expect(normalizeCompanyKey("(주) 마스터 마인드")).toBe("마스터마인드");
  });
});

describe("extractTitleCoreTokens", () => {
  const companyKey = normalizeCompanyKey(MASTERMIND);

  it("keeps role substance and strips recruitment boilerplate", () => {
    const coreJk = extractTitleCoreTokens(TITLE_JOBKOREA, companyKey);
    const coreSa = extractTitleCoreTokens(TITLE_SARAMIN, companyKey);

    for (const core of [coreJk, coreSa]) {
      expect(core.some((t) => t.includes("vod"))).toBe(true);
      expect(core.some((t) => t.includes("조교"))).toBe(true);
      expect(core.some((t) => t.includes("성우") || t.includes("아나운서"))).toBe(true);
      expect(core).not.toContain("모집");
      expect(core).not.toContain("채용");
      expect(core).not.toContain("신입");
      expect(core).not.toContain("경력");
    }
  });
});

describe("cross-source duplicate detection", () => {
  const companyKey = normalizeCompanyKey(MASTERMIND);

  it("matches jobkorea vs saramin example titles", () => {
    expect(
      isCrossSourceDuplicate(
        {
          title: TITLE_JOBKOREA,
          company: MASTERMIND,
          location: "서울 강남구",
          source_url: "https://example.com/jk/1",
        },
        {
          title: TITLE_SARAMIN,
          company: MASTERMIND,
          location: "서울 강남구",
          source_url: "https://example.com/sa/1",
        }
      )
    ).toBe(true);

    expect(titleSimilarity(TITLE_JOBKOREA, TITLE_SARAMIN, companyKey)).toBeGreaterThanOrEqual(
      0.42
    );
  });

  it("does not match different roles when only boilerplate overlaps", () => {
    expect(
      isCrossSourceDuplicate(
        {
          title: "신입 아나운서 모집",
          company: MASTERMIND,
          source_url: "https://example.com/a",
        },
        {
          title: "경력 영상편집자 채용",
          company: MASTERMIND,
          source_url: "https://example.com/b",
        }
      )
    ).toBe(false);
  });

  it("does not match announcer vs PD when boilerplate overlaps", () => {
    expect(
      isCrossSourceDuplicate(
        {
          title: "공개채용 아나운서 안내",
          company: MASTERMIND,
          source_url: "https://example.com/c",
        },
        {
          title: "공채 PD 모집",
          company: MASTERMIND,
          source_url: "https://example.com/d",
        }
      )
    ).toBe(false);
  });

  it("ignores location check when one side is missing", () => {
    expect(
      isCrossSourceDuplicate(
        {
          title: TITLE_JOBKOREA,
          company: MASTERMIND,
          source_url: "https://example.com/e",
        },
        {
          title: TITLE_SARAMIN,
          company: MASTERMIND,
          location: "서울 강남구",
          source_url: "https://example.com/f",
        }
      )
    ).toBe(true);
  });

  it("does not match when locations differ and both are present", () => {
    expect(
      isCrossSourceDuplicate(
        {
          title: TITLE_JOBKOREA,
          company: MASTERMIND,
          location: "서울 강남구",
          source_url: "https://example.com/g",
        },
        {
          title: TITLE_SARAMIN,
          company: MASTERMIND,
          location: "부산 해운대구",
          source_url: "https://example.com/h",
        }
      )
    ).toBe(false);
  });
});
