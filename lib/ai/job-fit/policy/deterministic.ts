import type { JobFitInput, JobFitResult } from "../domain/schema";
import {
  companyMatchesBlocklist,
  companyMatchesBroadcaster,
  fieldTextMatches,
  foldCase,
  titleMatchesAnyKeyword,
} from "./keyword-match";
import {
  JOB_FIT_BLOCK_COMPANIES,
  JOB_FIT_INTERN_ALLOWED_KEYWORDS,
  JOB_FIT_INTERN_SOURCE,
  JOB_FIT_KEYWORD_HARD_EXCLUDE,
  JOB_FIT_TITLE_ENTERTAINMENT,
  JOB_FIT_TITLE_HARD_EXCLUDE,
  JOB_FIT_RULES,
} from "./rules";

const synthetic = (partial: Omit<JobFitResult, "label" | "score" | "reasons" | "matched_rules"> & Partial<JobFitResult>): JobFitResult => ({
  label: partial.label ?? "rejected",
  score: partial.score ?? 12,
  reasons: partial.reasons ?? ["Deterministic policy gate."],
  matched_rules: partial.matched_rules ?? ["deterministic_gate"],
});

/** Segment-based match so "취재기자" does not count as token "기자". */
const internHasAllowedKeyword = (input: JobFitInput): boolean => {
  const raw = `${input.title}\n${input.company ?? ""}`;
  const segments = raw.split(/[\s,.·…|/&\\\-–—\n]+/).filter(Boolean);
  const allowed = new Set(JOB_FIT_INTERN_ALLOWED_KEYWORDS.map((k) => foldCase(k)));
  return segments.some((seg) => {
    const normalized = foldCase(
      seg.replace(/[()（）]/g, "").replace(/[\[\]]/g, "")
    );
    return allowed.has(normalized);
  });
};

/** Absolute rejects: blocklist company, hard keywords, entertainment in title. */
const hitsAbsoluteExclude = (input: JobFitInput): JobFitResult | null => {
  if (companyMatchesBlocklist(input.company, JOB_FIT_BLOCK_COMPANIES)) {
    return synthetic({
      label: "rejected",
      score: 8,
      reasons: ["Company matches blocklist (deterministic)."],
      matched_rules: ["blocklist_company"],
    });
  }

  const title = input.title;
  const company = input.company ?? "";
  const combined = `${title}\n${company}`;

  for (const kw of JOB_FIT_KEYWORD_HARD_EXCLUDE) {
    if (fieldTextMatches(combined, kw)) {
      return synthetic({
        label: "rejected",
        score: 10,
        reasons: [`Hard-exclude keyword matched: ${kw}.`],
        matched_rules: ["hard_exclude_keyword"],
      });
    }
  }

  if (fieldTextMatches(title, JOB_FIT_TITLE_ENTERTAINMENT)) {
    return synthetic({
      label: "rejected",
      score: 10,
      reasons: ["Title contains entertainment industry marker (deterministic)."],
      matched_rules: ["title_entertainment"],
    });
  }

  return null;
};

const hitsTitleHardExclude = (input: JobFitInput): boolean =>
  titleMatchesAnyKeyword(input.title, JOB_FIT_TITLE_HARD_EXCLUDE);

/**
 * Deterministic gate before LLM. Returns null when the case should go to the model.
 */
export const tryDeterministicDecision = (input: JobFitInput): JobFitResult | null => {
  const abs = hitsAbsoluteExclude(input);
  if (abs) return abs;

  if (input.source === JOB_FIT_INTERN_SOURCE) {
    if (!internHasAllowedKeyword(input)) {
      return synthetic({
        label: "rejected",
        score: 15,
        reasons: ["Intern channel requires at least one of: 기자, 아나운서, 리포터 in title or company."],
        matched_rules: ["intern_allowed_keywords"],
      });
    }
  }

  const broadcasterHit = companyMatchesBroadcaster(input.company, JOB_FIT_RULES.targetBroadcasters);
  if (!broadcasterHit && hitsTitleHardExclude(input)) {
    return synthetic({
      label: "rejected",
      score: 12,
      reasons: ["Title matches hard-exclude keyword list (deterministic)."],
      matched_rules: ["title_hard_exclude"],
    });
  }

  return null;
};
