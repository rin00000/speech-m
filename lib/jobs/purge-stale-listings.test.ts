import { describe, expect, it } from "vitest";
import { addCalendarDays, koreaTodayIso } from "./purge-stale-listings";

describe("purge-stale-listings calendar helpers", () => {
  it("addCalendarDays rolls month boundaries", () => {
    expect(addCalendarDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addCalendarDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("koreaTodayIso returns YYYY-MM-DD", () => {
    expect(koreaTodayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
