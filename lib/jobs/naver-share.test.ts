import { describe, expect, it } from "vitest";
import {
  buildBlogContent,
  buildJobShareMetaDescription,
  buildJobSharePagePath,
  buildJobShareTitle,
  buildNaverShareUrl,
} from "@/lib/jobs/naver-share";

const sample = {
  id: "job-uuid-1",
  title: "아나운서 공개채용",
  company: "스피치미디어",
  location: "서울",
  deadline: "2026-05-31",
  source: "mediajob_announcer" as const,
  source_url: "https://example.com/jobs/1?foo=bar&baz=1",
};

describe("buildNaverShareUrl", () => {
  it("uses source_url as Naver body link and encodes title", () => {
    const shareUrl = buildNaverShareUrl(sample, "https://app.speech-m.example");
    expect(shareUrl.startsWith("https://share.naver.com/web/shareView?")).toBe(true);
    expect(shareUrl).toContain(
      "url=https%3A%2F%2Fexample.com%2Fjobs%2F1%3Ffoo%3Dbar%26baz%3D1",
    );
    expect(shareUrl).toContain(
      "title=%5B%EC%B1%84%EC%9A%A9%5D+%EC%8A%A4%ED%94%BC%EC%B9%98%EB%AF%B8%EB%94%94%EC%96%B4+%EC%95%84%EB%82%98%EC%9A%B4%EC%84%9C+%EA%B3%B5%EA%B0%9C%EC%B1%84%EC%9A%A9",
    );
  });

  it("strips trailing slash from site origin (used only for landing fallback)", () => {
    const shareUrl = buildNaverShareUrl(sample, "https://app.example.com/");
    expect(shareUrl).toContain("url=https%3A%2F%2Fexample.com%2Fjobs%2F1%3Ffoo%3Dbar%26baz%3D1");
  });

  it("falls back to internal share landing when source_url is empty", () => {
    const shareUrl = buildNaverShareUrl(
      { ...sample, source_url: "   " },
      "https://app.example.com",
    );
    expect(shareUrl).toContain("url=https%3A%2F%2Fapp.example.com%2Fjobs%2Fjob-uuid-1%2Fshare");
  });
});

describe("buildJobSharePagePath", () => {
  it("returns app router path", () => {
    expect(buildJobSharePagePath("abc")).toBe("/jobs/abc/share");
  });
});

describe("buildJobShareTitle", () => {
  it("matches 채용 title pattern", () => {
    expect(buildJobShareTitle({ title: sample.title, company: sample.company })).toBe(
      "[채용] 스피치미디어 아나운서 공개채용",
    );
  });
});

describe("buildJobShareMetaDescription", () => {
  it("flattens multiline content and respects max length", () => {
    const d = buildJobShareMetaDescription(sample, 80);
    expect(d).not.toContain("\n");
    expect(d.length).toBeLessThanOrEqual(80);
    expect(d.endsWith("…")).toBe(true);
  });
});

describe("buildBlogContent", () => {
  it("builds fixed format content from approved posting fields", () => {
    const content = buildBlogContent(sample);
    expect(content).toContain("스피치미디어에서 아나운서 공개채용 포지션을 채용 중입니다.");
    expect(content).toContain("- 근무지: 서울");
    expect(content).toContain("- 출처: 아나운서");
    expect(content).toContain("- 지원 링크: https://example.com/jobs/1?foo=bar&baz=1");
  });
});
