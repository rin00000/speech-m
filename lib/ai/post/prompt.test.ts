import { describe, expect, it } from "vitest";
import { buildJobPostDraftPrompt } from "./prompt";

describe("buildJobPostDraftPrompt", () => {
  it("includes blog facts and editor instructions", () => {
    const prompt = buildJobPostDraftPrompt({
      title: "앵커",
      company: "테스트방송",
      location: "서울",
      deadline: "2026-12-31",
      source: "mediajob_announcer",
      source_url: "https://example.com/job/1",
    });
    expect(prompt).toContain("에디터");
    expect(prompt).toContain("테스트방송");
    expect(prompt).toContain("https://example.com/job/1");
    expect(prompt).toContain("#채용");
  });
});
