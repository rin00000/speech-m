import type { JobFitInput, JobFitResult } from "../domain/schema";
import {
  isHomeshoppingCompanyOrTitle,
  isInternetSmallNewspaperCompany,
  titleHasBroadcasterPendingRole,
  titleHasBroadcasterRejectRole,
  titleHasHomeshoppingApproveRole,
  titleHasInternReporterRole,
  titleHasTargetBroadcastRole,
} from "./company-newspaper";
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

const hitsHomeshoppingReject = (input: JobFitInput): JobFitResult | null => {
  if (!isHomeshoppingCompanyOrTitle(input.company, input.title)) {
    return null;
  }
  if (titleHasHomeshoppingApproveRole(input.title)) {
    return null;
  }
  return synthetic({
    label: "rejected",
    score: 15,
    reasons: ["Home shopping posting: only show-host (쇼호스트) roles are in scope."],
    matched_rules: ["homeshopping_non_showhost"],
  });
};

const hitsBroadcasterRoleGate = (input: JobFitInput): JobFitResult | null => {
  if (!companyMatchesBroadcaster(input.company, JOB_FIT_RULES.targetBroadcasters)) {
    return null;
  }
  if (titleHasBroadcasterRejectRole(input.title)) {
    return synthetic({
      label: "rejected",
      score: 12,
      reasons: [
        "Target broadcaster company but admin/production-office role (행정, 제작) — out of scope.",
      ],
      matched_rules: ["broadcaster_non_target_role"],
    });
  }
  if (titleHasBroadcasterPendingRole(input.title)) {
    return synthetic({
      label: "rejected",
      score: 52,
      reasons: [
        "Target broadcaster company but production/VJ role (영상취재, VJ, etc.) — defer to admin review.",
      ],
      matched_rules: ["broadcaster_pending_role"],
    });
  }
  return synthetic({
    label: "approved",
    score: 85,
    reasons: ["Company matches target broadcasters (deterministic)."],
    matched_rules: ["target_broadcasters"],
  });
};

const hitsExclusionKeywordsReject = (input: JobFitInput): JobFitResult | null => {
  const combined = `${input.title}\n${input.company ?? ""}`;
  for (const kw of JOB_FIT_RULES.exclusionKeywords) {
    if (fieldTextMatches(combined, kw)) {
      return synthetic({
        label: "rejected",
        score: 18,
        reasons: [`Exclusion keyword matched: ${kw}.`],
        matched_rules: ["exclusion_keywords"],
      });
    }
  }
  return null;
};

const hitsInternetNewspaperRoleGate = (input: JobFitInput): JobFitResult | null => {
  if (!isInternetSmallNewspaperCompany(input.company)) {
    return null;
  }
  if (titleHasTargetBroadcastRole(input.title)) {
    return null;
  }
  return synthetic({
    label: "rejected",
    score: 15,
    reasons: [
      "Internet/small newspaper company: only announcer-style roles go to review; reporter and other roles are excluded.",
    ],
    matched_rules: ["internet_newspaper_non_target_role"],
  });
};

/**
 * Deterministic gate before LLM. Returns null when the case should go to the model.
 */
export const tryDeterministicDecision = (input: JobFitInput): JobFitResult | null => {
  const abs = hitsAbsoluteExclude(input);
  if (abs) return abs;

  const homeshoppingReject = hitsHomeshoppingReject(input);
  if (homeshoppingReject) return homeshoppingReject;

  const broadcasterGate = hitsBroadcasterRoleGate(input);
  if (broadcasterGate) return broadcasterGate;

  const exclusionReject = hitsExclusionKeywordsReject(input);
  if (exclusionReject) return exclusionReject;

  if (titleHasInternReporterRole(input.title)) {
    return synthetic({
      label: "approved",
      score: 72,
      reasons: ["Title indicates intern reporter role (cross-source)."],
      matched_rules: ["intern_reporter_title"],
    });
  }

  if (input.source === JOB_FIT_INTERN_SOURCE) {
    if (!internHasAllowedKeyword(input)) {
      return synthetic({
        label: "rejected",
        score: 15,
        reasons: ["Intern channel requires at least one of: 기자, 아나운서, 리포터 in title or company."],
        matched_rules: ["intern_allowed_keywords"],
      });
    }
    return null;
  }

  const newspaperGate = hitsInternetNewspaperRoleGate(input);
  if (newspaperGate) return newspaperGate;

  const targetRoleInTitle = titleHasTargetBroadcastRole(input.title);
  if (!targetRoleInTitle && hitsTitleHardExclude(input)) {
    return synthetic({
      label: "rejected",
      score: 12,
      reasons: ["Title matches hard-exclude keyword list (deterministic)."],
      matched_rules: ["title_hard_exclude"],
    });
  }

  return null;
};
