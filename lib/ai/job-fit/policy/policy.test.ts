import { describe, expect, it } from "vitest";
import type { JobFitInput } from "../domain/schema";
import { tryDeterministicDecision } from "./deterministic";
import {
  companyMatchesBlocklist,
  companyMatchesBroadcaster,
  fieldTextMatches,
  latinRuns,
} from "./keyword-match";
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

  it("applies title hard exclude without broadcaster", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "아나운서 촬영 스탭",
      company: "일반회사",
    });
    expect(r?.label).toBe("rejected");
  });
});
