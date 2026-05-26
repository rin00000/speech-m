import { describe, expect, it } from "vitest";
import { toFinalStatus, type JobFitInput } from "../domain/schema";
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
  titleMatchesTargetBroadcaster,
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
    expect(companyMatchesBroadcaster("경인방송", JOB_FIT_RULES.targetBroadcasters)).toBe(true);
    expect(companyMatchesBroadcaster("㈜머니투데이방송", JOB_FIT_RULES.targetBroadcasters)).toBe(true);
    expect(companyMatchesBroadcaster("전주문화방송", JOB_FIT_RULES.targetBroadcasters)).toBe(true);
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
    expect(r?.matched_rules).toContain("target_roles");
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
    expect(r?.matched_rules).toContain("target_roles");
  });

  it("rejects broadcaster non-target role before target role approval", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "아나운서 촬영 스탭",
      company: "KBS미디어",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("broadcaster_non_target_role");
    expect(toFinalStatus(r!)).toBe("rejected");
  });

  it("returns null for broadcaster without target role in title", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "2026 신입 공개 채용",
      company: "KBS",
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

  it("rejects non-target duty even when target role is in title", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "아나운서 촬영 스탭",
      company: "일반회사",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("broadcaster_non_target_role");
  });

  it("rejects intern channel at non-target broadcaster", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      source: JOB_FIT_INTERN_SOURCE,
      title: "신입 기자 모집",
      company: "(주)뉴스포스트신문사",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("intern_channel_not_target_broadcaster");
  });

  it("approves broadcaster 취재기자 (main channel)", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "취재기자 모집",
      company: "JTV",
    });
    expect(r?.label).toBe("approved");
    expect(r?.matched_rules).toContain("target_broadcasters");
    expect(r?.matched_rules).toContain("target_roles");
  });

  it("approves Jeonju MBC reporter when company uses formal broadcaster name", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "2026년 전주MBC 방송기술, 취재기자 공개채용(신입/경력)",
      company: "전주문화방송",
    });
    expect(r?.label).toBe("approved");
    expect(r?.matched_rules).toContain("target_broadcasters");
    expect(r?.matched_rules).toContain("target_roles");
  });

  it("approves reporter at formal Jeonju broadcaster company without title broadcaster name", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "취재기자 공개채용",
      company: "전주문화방송",
    });
    expect(r?.label).toBe("approved");
    expect(r?.matched_rules).toContain("target_broadcasters");
    expect(r?.matched_rules).toContain("target_roles");
  });

  it("does not approve broadcaster posting without target role even at formal Jeonju company", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "방송기술 공개채용",
      company: "전주문화방송",
    });
    expect(r).toBeNull();
  });

  it("rejects non-target role even when only title has target broadcaster name", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "전주MBC 영상취재 취재기자 공개채용",
      company: "일반회사",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("broadcaster_non_target_role");
    expect(toFinalStatus(r!)).toBe("rejected");
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
    expect(r?.matched_rules).toContain("target_roles");
  });

  it("approves cross-source intern reporter at target broadcaster (헬스조선)", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      source: "jobkorea",
      title: "헬스조선 취재팀 인턴 기자 채용(5월 31일 마감)",
      company: "㈜헬스조선",
    });
    expect(r?.label).toBe("approved");
    expect(r?.matched_rules).toContain("intern_reporter_title");
    expect(r?.matched_rules).toContain("target_broadcasters");
  });

  it("rejects intern reporter at non-target broadcaster (뉴스트리)", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      source: JOB_FIT_INTERN_SOURCE,
      title: "뉴스트리 채용연계형 인턴기자 모집",
      company: "(주)뉴스트리",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("blocklist_company");
  });

  it("approves intern reporter at target broadcaster (JTV)", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      source: "jobkorea",
      title: "JTV 인턴기자 공개 채용",
      company: "JTV",
    });
    expect(r?.label).toBe("approved");
    expect(r?.matched_rules).toContain("intern_reporter_title");
    expect(r?.matched_rules).toContain("target_broadcasters");
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
    expect(r?.matched_rules).toContain("target_roles");
  });

  it("rejects show-host at regional broadcaster", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "쇼호스트 신입 공개채용",
      company: "KNN",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("showhost_not_major_homeshopping");
  });

  it("approves show-host at major homeshopping company", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "쇼호스트 신입 공개채용",
      company: "㈜공영홈쇼핑",
    });
    expect(r?.label).toBe("approved");
    expect(r?.matched_rules).toContain("major_homeshopping_showhost");
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

  it("rejects 공영홈쇼핑 NCS blind hire without show-host", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "2026년 공영홈쇼핑 NCS기반 블라인드 채용 (채용형 청년인턴/무기계약직)",
      company: "㈜공영홈쇼핑",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("homeshopping_non_showhost");
  });

  it("rejects broadcaster 행정 role", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "행정직 채용",
      company: "KBS",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("broadcaster_non_target_role");
  });

  it("rejects broadcaster 제작 role", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "제작 PD 채용",
      company: "MBC",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("broadcaster_non_target_role");
  });

  it("rejects YTN ENG and camera assistant role without HITL", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "[2명채용/영상취재/카메라보조] ENG/취재보조/방송촬영/장비관리/오디오맨/카메라/촬영보조",
      company: "YTN",
      source: "mediajob_announcer",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("broadcaster_non_target_role");
    expect(toFinalStatus(r!)).toBe("rejected");
  });

  it("approves marine forecast broadcast weathercaster by title marker", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "해양예보방송 해양캐스터 모집(신입&경력)",
      company: "㈜올포랜드",
      source: "mediajob_announcer",
    });
    expect(r?.label).toBe("approved");
    expect(r?.matched_rules).toContain("target_broadcaster_title_marker");
    expect(r?.matched_rules).toContain("target_roles");
  });

  it("rejects 시험방송 title before LLM", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "6/13) 창원, 시험방송",
      company: "꿈을Dream",
      source: "mediajob_announcer",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("always_reject_title_keyword");
  });

  it("rejects live content presenter title before LLM", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "[온라인사업부] 라이브컨텐츠 기획 및 진행자 채용",
      company: "피쉬데이",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("always_reject_title_keyword");
  });

  it("does not reject 딜라이브 broadcaster name as 라이브 keyword", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "딜라이브 아나운서 모집",
      company: "딜라이브",
    });
    expect(r?.label).toBe("approved");
    expect(r?.matched_rules).toContain("target_broadcasters");
  });

  it("rejects AD role even when broadcaster and reporter words appear", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "[취재AD/국제팀/4시간근무] 뉴스/취재기자/영어기사/기사서치/자료검색/취재보조",
      company: "MBC",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("always_reject_title_keyword");
  });

  it("rejects shopping-mall seller show-host title before LLM", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "(성과에 따른 확실한 보상) 여성의류 쇼핑몰 셀러 (쇼호스트) 모집",
      company: "하이루",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("always_reject_title_keyword");
  });

  it("rejects driving and vehicle role at target broadcaster", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "[운전직/광화문/월284만원] 취재차량/차량운전/차량관리/취재보조",
      company: "연합뉴스",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("broadcaster_non_target_role");
    expect(toFinalStatus(r!)).toBe("rejected");
  });

  it("rejects non-broadcaster title with VJ via title hard exclude", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "스튜디오 VJ 모집",
      company: "일반회사",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("title_hard_exclude");
  });

  it("rejects 연합뉴스TV VJ 영상취재 without HITL", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "[VJ/취재기자/연합뉴스TV] 영상취재부/VJ/카메라/ENG/6mm",
      company: "연합뉴스TV",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.score).toBe(12);
    expect(r?.matched_rules).toContain("broadcaster_non_target_role");
    expect(toFinalStatus(r!)).toBe("rejected");
  });

  it("rejects 연합뉴스TV 영상 편집 without HITL", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "영상 편집 PD 채용",
      company: "연합뉴스TV",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.score).toBe(12);
    expect(r?.matched_rules).toContain("broadcaster_non_target_role");
    expect(toFinalStatus(r!)).toBe("rejected");
  });

  it("rejects 연합뉴스TV 비디오 without HITL", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "비디오 제작 담당 채용",
      company: "연합뉴스TV",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.matched_rules).toContain("broadcaster_non_target_role");
    expect(toFinalStatus(r!)).toBe("rejected");
  });

  it("defers 현대 모터스튜디오 도슨트 to pending (before title hard exclude)", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "도슨트(진행자) 채용",
      company: "현대 모터스튜디오",
    });
    expect(r?.label).toBe("rejected");
    expect(r?.score).toBe(52);
    expect(r?.matched_rules).toContain("motor_studio_docent_pending");
    expect(toFinalStatus(r!)).toBe("pending");
  });

  it("defers motor studio with 편집 in title to pending (hard exclude bypass)", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "영상 편집·도슨트 모집",
      company: "현대 모터스튜디오",
    });
    expect(r?.matched_rules).toContain("motor_studio_docent_pending");
    expect(toFinalStatus(r!)).toBe("pending");
  });

  it("approves homeshopping show-host via major company gate", () => {
    const r = tryDeterministicDecision({
      ...baseInput(),
      title: "쇼호스트 신입 공개채용",
      company: "공영홈쇼핑",
    });
    expect(r?.label).toBe("approved");
    expect(r?.matched_rules).toContain("major_homeshopping_showhost");
    expect(r?.matched_rules).not.toContain("homeshopping_non_showhost");
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

describe("titleMatchesTargetBroadcaster", () => {
  it("detects target broadcaster names in title", () => {
    expect(titleMatchesTargetBroadcaster("2026년 전주MBC 취재기자 공개채용")).toBe(true);
  });
});
