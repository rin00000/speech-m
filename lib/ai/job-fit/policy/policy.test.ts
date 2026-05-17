import { describe, expect, it } from "vitest";
import type { JobFitInput } from "../domain/schema";
import { tryDeterministicDecision } from "./deterministic";
import {
  companyMatchesBlocklist,
  companyMatchesBroadcaster,
  fieldTextMatches,
  latinRuns,
} from "./keyword-match";
import {
  isInternetSmallNewspaperCompany,
  titleHasInternReporterRole,
  titleHasTargetBroadcastRole,
} from "./company-newspaper";
import { JOB_FIT_INTERN_SOURCE, JOB_FIT_RULES } from "./rules";

const baseInput = (): JobFitInput => ({
  id: "t1",
  title: "테스트",
  company: "테스트컴퍼니",
  location: "서울",
  source: "custom",
  sourceUrl: "https://example.com",
});

describe("fieldTextMatches", () => {
  it("does not match short ad inside head", () => {
    expect(fieldTextMatches("headline", "ad")).toBe(false);
    expect(fieldTextMatches("our ad here", "ad")).toBe(true);
  });

  it("matches Korean substring", () => {
    expect(fieldTextMatches("현장 촬영 보조", "촬영")).toBe(true);
  });
});

describe("latinRuns", () => {
  it("extracts latin runs", () => {
    expect(latinRuns("KBS미디어")).toEqual(["kbs"]);
    expect(latinRuns("hello ad world")).toEqual(["hello", "ad", "world"]);
  });
});

describe("companyMatchesBlocklist", () => {
  it("matches 206 with digit boundaries", () => {
    expect(companyMatchesBlocklist("A206B", ["206"])).toBe(true);
    expect(companyMatchesBlocklist("1206", ["206"])).toBe(false);
  });

  it("matches blocklist substring for Korean names", () => {
    expect(companyMatchesBlocklist("(주)원투원TV", ["원투원TV"])).toBe(true);
  });
});

describe("companyMatchesBroadcaster", () => {
  it("substring on company", () => {
    expect(companyMatchesBroadcaster("KBS미디어", JOB_FIT_RULES.targetBroadcasters)).toBe(true);
    expect(companyMatchesBroadcaster("연합뉴스TV 보도국", JOB_FIT_RULES.targetBroadcasters)).toBe(true);
  });
});

describe("tryDeterministicDecision", () => {
  it("rejects blocklist company", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      company: "원투원TV",
    });
    expect(r?.label).toBe("rejected");
  });

  it("approves broadcaster before intern source gate (JTV 취재기자)", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      source: JOB_FIT_INTERN_SOURCE,
      title: "취재기자 모집",
      company: "JTV",
    });
    expect(r?.label).toBe("approved");
    expect(r?.matched_rules).toContain("target_broadcasters");
  });

  it("approves broadcaster when intern segment 기자 is present", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      source: JOB_FIT_INTERN_SOURCE,
      title: "신입 기자 모집",
      company: "JTV",
    });
    expect(r?.label).toBe("approved");
    expect(r?.matched_rules).toContain("target_broadcasters");
  });

  it("approves broadcaster and skips title hard exclude", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "아나운서 촬영 스탭",
      company: "KBS미디어",
    });
    expect(r?.label).toBe("approved");
    expect(r?.matched_rules).toContain("target_broadcasters");
  });

  it("applies title hard exclude without broadcaster or target role", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "현장 촬영 보조",
      company: "일반회사",
    });
    expect(r?.label).toBe("rejected");
  });

  it("bypasses title hard exclude when target role is in title", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "아나운서 촬영 스탭",
      company: "일반회사",
    });
    expect(r).toBeNull();
  });

  it("returns null for intern with 기자 at internet newspaper company", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      source: JOB_FIT_INTERN_SOURCE,
      title: "신입 기자 모집",
      company: "(주)뉴스포스트신문사",
    });
    expect(r).toBeNull();
  });

  it("approves broadcaster 취재기자 (main channel)", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "취재기자 모집",
      company: "JTV",
    });
    expect(r?.label).toBe("approved");
    expect(r?.matched_rules).toContain("target_broadcasters");
  });

  it("rejects internet newspaper reporter role", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "경제·금융 경력 기자 모집",
      company: "(주)뉴스포스트신문사",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("internet_newspaper_non_target_role");
  });

  it("rejects internet newspaper unclear role", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "채용 담당",
      company: "○○일보",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("internet_newspaper_non_target_role");
  });

  it("returns null for internet newspaper announcer role", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "아나운서 모집",
      company: "○○신문사",
    });
    expect(r).toBeNull();
  });

  it("bypasses title 신문 hard exclude when announcer role present", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "인터넷신문 아나운서 모집",
      company: "일반미디어",
    });
    expect(r).toBeNull();
  });

  it("approves intern at broadcaster without LLM", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      source: JOB_FIT_INTERN_SOURCE,
      title: "신입 기자 모집",
      company: "JTV",
    });
    expect(r?.label).toBe("approved");
    expect(r?.matched_rules).toContain("target_broadcasters");
  });

  it("approves cross-source intern reporter by title (헬스조선)", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      source: "jobkorea",
      title: "헬스조선 취재팀 인턴 기자 채용(5월 31일 마감)",
      company: "㈜헬스조선",
    });
    expect(r?.label).toBe("approved");
    expect(r?.score).toBeGreaterThanOrEqual(60);
    expect(r?.matched_rules).toContain("intern_reporter_title");
  });

  it("does not approve 경력 기자 without intern signal at newspaper", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "경제·금융 경력 기자 모집",
      company: "(주)뉴스포스트신문사",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("internet_newspaper_non_target_role");
  });

  it("does not treat 취재기자 only as intern reporter", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "취재기자 모집",
      company: "지역일간지",
    });
    expect(r?.label).not.toBe("approved");
  });

  it("rejects exclusion keyword on non-broadcaster", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "MC/행사 진행자 단기 계약",
      company: "소형 에이전시C",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("exclusion_keywords");
  });

  it("rejects 1인 미디어 in title", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "1인 미디어 콘텐츠 진행자",
      company: "스타트업B",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("exclusion_keywords");
  });

  it("approves broadcaster even when title has exclusion keyword", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "인플루언서 협업 아나운서",
      company: "KBS",
    });
    expect(r?.label).toBe("approved");
    expect(r?.matched_rules).toContain("target_broadcasters");
  });

  it("rejects 유튜브 전용 on non-broadcaster", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "유튜브 전용 채널 크리에이터",
      company: "스타트업",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("exclusion_keywords");
  });
});

describe("titleHasInternReporterRole", () => {
  it("detects 헬스조선 intern reporter title", () => {
    expect(
      titleHasInternReporterRole("헬스조선 취재팀 인턴 기자 채용(5월 31일 마감)")
    ).toBe(true);
  });

  it("detects 인턴기자 phrase", () => {
    expect(titleHasInternReporterRole("신문사 인턴기자 채용")).toBe(true);
  });

  it("rejects 경력 기자 without intern", () => {
    expect(titleHasInternReporterRole("경제·금융 경력 기자 모집")).toBe(false);
  });

  it("rejects 취재기자 without intern segment", () => {
    expect(titleHasInternReporterRole("취재기자 모집")).toBe(false);
  });
});

describe("isInternetSmallNewspaperCompany", () => {
  it("classifies 뉴스포스트신문사", () => {
    expect(isInternetSmallNewspaperCompany("(주)뉴스포스트신문사")).toBe(true);
  });

  it("does not classify KBS as newspaper", () => {
    expect(isInternetSmallNewspaperCompany("KBS미디어")).toBe(false);
  });

  it("classifies 일보 marker", () => {
    expect(isInternetSmallNewspaperCompany("○○일보")).toBe(true);
  });
});

describe("titleHasTargetBroadcastRole", () => {
  it("detects 아나운서", () => {
    expect(titleHasTargetBroadcastRole("아나운서 모집")).toBe(true);
  });

  it("does not treat 취재기자 as target role", () => {
    expect(titleHasTargetBroadcastRole("취재기자 모집")).toBe(false);
  });
});
