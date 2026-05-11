import { describe, expect, it } from "vitest";
import { parseDeadline, TEXT_DEADLINE } from "@/lib/crawl/shared";

describe("parseDeadline", () => {
  /** Local calendar date; matches `parseDeadline` / `mmddToIso` local Date usage. */
  const today = new Date(2026, 4, 11);

  it("returns known text deadlines unchanged", () => {
    for (const t of TEXT_DEADLINE) {
      expect(parseDeadline(t, today)).toBe(t);
    }
  });

  it("parses jobkorea-style ~MM/DD to an ISO date string", () => {
    const r = parseDeadline("~05/20(화)", today);
    expect(r).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r!.startsWith("2026-05-")).toBe(true);
  });

  it("returns null for empty input", () => {
    expect(parseDeadline("  ", today)).toBeNull();
  });
});
