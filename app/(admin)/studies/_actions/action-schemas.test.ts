/**
 * 릴레이 스터디 액션 입력 검증 helper를 검증합니다.
 */

import { describe, expect, it } from "vitest";
import { parseFutureQuestDueAt, studyApplicationMessageSchema } from "./action-schemas";

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

  it("interprets datetime-local values as Korea time", () => {
    const result = parseFutureQuestDueAt(
      "2026-06-30T10:01",
      new Date("2026-06-30T00:00:00.000Z")
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.toISOString()).toBe("2026-06-30T01:01:00.000Z");
    }
  });
});

describe("studyApplicationMessageSchema", () => {
  it("accepts an empty optional message", () => {
    expect(studyApplicationMessageSchema.safeParse(undefined).success).toBe(true);
    expect(studyApplicationMessageSchema.safeParse("").success).toBe(true);
  });

  it("rejects messages over 500 characters", () => {
    const result = studyApplicationMessageSchema.safeParse("a".repeat(501));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("신청 메모는 500자 이하로 입력하세요.");
    }
  });
});
