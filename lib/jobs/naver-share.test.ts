import { describe, expect, it } from "vitest";
import { buildBlogContent, buildNaverShareUrl } from "@/lib/jobs/naver-share";

const sample = {
  title: "아나운서 공개채용",
  company: "스피치미디어",
  location: "서울",
  deadline: "2026-05-31",
  source: "mediajob_announcer" as const,
  source_url: "https://example.com/jobs/1?foo=bar&baz=1",
};

describe("buildNaverShareUrl", () => {
  it("encodes both url and title for naver share endpoint", () => {
    const shareUrl = buildNaverShareUrl(sample);
    expect(shareUrl.startsWith("https://share.naver.com/web/shareView?")).toBe(true);
    expect(shareUrl).toContain(
      "url=https%3A%2F%2Fexample.com%2Fjobs%2F1%3Ffoo%3Dbar%26baz%3D1",
    );
    expect(shareUrl).toContain(
      "title=%5B%EC%B1%84%EC%9A%A9%5D+%EC%8A%A4%ED%94%BC%EC%B9%98%EB%AF%B8%EB%94%94%EC%96%B4+%EC%95%84%EB%82%98%EC%9A%B4%EC%84%9C+%EA%B3%B5%EA%B0%9C%EC%B1%84%EC%9A%A9",
    );
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
