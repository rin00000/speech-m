/**
 * deterministic 정책 게이트에서 반복해서 쓰는 순수 helper.
 * 판정 순서 파일은 개별 gate 흐름만 읽히도록 공통 결과 생성과 context 계산을 분리한다.
 */

import type { JobFitInput, JobFitResult } from "../domain/schema";
import {
  titleHasTargetBroadcasterMarker,
  titleMatchesTargetBroadcaster,
} from "./company-newspaper";
import { companyMatchesBroadcaster, fieldTextMatches, foldCase } from "./keyword-match";
import {
  JOB_FIT_ALWAYS_REJECT_TITLE_KEYWORDS,
  JOB_FIT_INTERN_ALLOWED_KEYWORDS,
  JOB_FIT_RULES,
} from "./rules";

export const synthetic = (
  partial: Omit<JobFitResult, "label" | "score" | "reasons" | "matched_rules"> &
    Partial<JobFitResult>,
): JobFitResult => ({
  label: partial.label ?? "rejected",
  score: partial.score ?? 12,
  reasons: partial.reasons ?? ["Deterministic policy gate."],
  matched_rules: partial.matched_rules ?? ["deterministic_gate"],
});

export const internHasAllowedKeyword = (input: JobFitInput): boolean => {
  const raw = `${input.title}\n${input.company ?? ""}`;
  const segments = raw.split(/[\s,.·…|/&\\\-–—\n]+/).filter(Boolean);
  const allowed = new Set(JOB_FIT_INTERN_ALLOWED_KEYWORDS.map((keyword) => foldCase(keyword)));
  return segments.some((segment) => {
    const normalized = foldCase(
      segment.replace(/[()（）]/g, "").replace(/[\[\]]/g, ""),
    );
    return allowed.has(normalized);
  });
};

const titleWithoutDlive = (title: string): string => title.split("딜라이브").join("");

export const findAlwaysRejectTitleKeyword = (title: string): string | null => {
  for (const keyword of JOB_FIT_ALWAYS_REJECT_TITLE_KEYWORDS) {
    const field = keyword === "라이브" ? titleWithoutDlive(title) : title;
    if (fieldTextMatches(field, keyword)) return keyword;
  }
  return null;
};

export const hasTargetBroadcasterContext = (input: JobFitInput): boolean =>
  companyMatchesBroadcaster(input.company, JOB_FIT_RULES.targetBroadcasters) ||
  titleMatchesTargetBroadcaster(input.title) ||
  titleHasTargetBroadcasterMarker(input.title);
