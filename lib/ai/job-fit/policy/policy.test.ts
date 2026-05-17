import { describe, expect, it } from "vitest";
import type { JobFitInput } from "../domain/schema";
import { tryDeterministicDecision } from "./deterministic";
import {
  companyMatchesBlocklist,
  companyMatchesBroadcaster,
  fieldTextMatches,
  latinRuns,
} from "./keyword-match";
import { isInternetSmallNewspaperCompany, titleHasTargetBroadcastRole } from "./company-newspaper";
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

  it("rejects intern source without allowed segment", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      source: JOB_FIT_INTERN_SOURCE,
      title: "취재기자 모집",
      company: "JTV",
    });
    expect(r?.label).toBe("rejected");
  });

  it("does not reject intern when segment 기자 is present", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      source: JOB_FIT_INTERN_SOURCE,
      title: "신입 기자 모집",
      company: "JTV",
    });
    expect(r).toBeNull();
  });

  it("skips title hard exclude when broadcaster company matches", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "아나운서 촬영 스탭",
      company: "KBS미디어",
    });
    expect(r).toBeNull();
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

  it("returns null for broadcaster 취재기자 (main channel)", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "취재기자 모집",
      company: "JTV",
    });
    expect(r).toBeNull();
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

  it("returns null for intern with allowed keyword without falling through to title exclude", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      source: JOB_FIT_INTERN_SOURCE,
      title: "신입 기자 모집",
      company: "JTV",
    });
    expect(r).toBeNull();
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
