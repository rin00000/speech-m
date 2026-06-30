/**
 * 릴레이 스터디 액션 입력 검증 helper를 검증합니다.
 */

import { describe, expect, it } from "vitest";
import { parseFutureQuestDueAt } from "./action-schemas";

describe("parseFutureQuestDueAt", () => {
  const now = new Date("2026-06-30T10:00:00.000Z");

  it("rejects invalid due date strings", () => {
    expect(parseFutureQuestDueAt("not-a-date", now)).toEqual({
      success: false,
      error: "마감일 형식이 올바르지 않습니다.",
    });
  });

  it("rejects due dates that are not in the future", () => {
    expect(parseFutureQuestDueAt("2026-06-30T09:59:00.000Z", now)).toEqual({
      success: false,
      error: "마감일은 현재 시간 이후로 설정하세요.",
    });

    expect(parseFutureQuestDueAt("2026-06-30T10:00:00.000Z", now)).toEqual({
      success: false,
      error: "마감일은 현재 시간 이후로 설정하세요.",
    });
  });

  it("accepts future due dates", () => {
    const result = parseFutureQuestDueAt("2026-06-30T10:01:00.000Z", now);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.toISOString()).toBe("2026-06-30T10:01:00.000Z");
    }
  });
});
