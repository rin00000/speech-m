import type { JobFitInput, JobFitResult } from "../domain/schema";
import {
  companyMatchesMajorHomeshopping,
  isHomeshoppingCompanyOrTitle,
  isInternetSmallNewspaperCompany,
  isMotorStudioCompanyOrTitle,
  titleHasAlwaysRejectKeyword,
  titleHasBroadcasterRejectRole,
  titleHasHomeshoppingApproveRole,
  titleHasInternReporterRole,
  titleHasJobFitTargetRole,
  titleHasTargetBroadcasterMarker,
  titleHasTargetBroadcastRole,
} from "./company-newspaper";
import {
  companyMatchesBlocklist,
  companyMatchesBroadcaster,
  fieldTextMatches,
  titleMatchesAnyKeyword,
} from "./keyword-match";
import {
  JOB_FIT_BLOCK_COMPANIES,
  JOB_FIT_INTERN_SOURCE,
  JOB_FIT_KEYWORD_HARD_EXCLUDE,
  JOB_FIT_TITLE_ENTERTAINMENT,
  JOB_FIT_TITLE_HARD_EXCLUDE,
  JOB_FIT_RULES,
} from "./rules";
import {
  findAlwaysRejectTitleKeyword,
  hasTargetBroadcasterContext,
  internHasAllowedKeyword,
  synthetic,
} from "./deterministic-helpers";

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

  const titleHardReject = findAlwaysRejectTitleKeyword(title);
  if (titleHardReject && titleHasAlwaysRejectKeyword(title)) {
    return synthetic({
      label: "rejected",
      score: 10,
      reasons: [`Title hard-reject keyword matched: ${titleHardReject}.`],
      matched_rules: ["always_reject_title_keyword"],
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

const hitsShowhostScopeGate = (input: JobFitInput): JobFitResult | null => {
  if (!titleHasHomeshoppingApproveRole(input.title)) {
    return null;
  }
  if (companyMatchesMajorHomeshopping(input.company)) {
    return synthetic({
      label: "approved",
      score: 88,
      reasons: ["Show-host role at major home-shopping company (deterministic)."],
      matched_rules: ["major_homeshopping_showhost"],
    });
  }
  return synthetic({
    label: "rejected",
    score: 15,
    reasons: ["Show-host roles are in scope only at major home-shopping companies."],
    matched_rules: ["showhost_not_major_homeshopping"],
  });
};

const hitsInternReporterScopeGate = (input: JobFitInput): JobFitResult | null => {
  if (!titleHasInternReporterRole(input.title)) {
    return null;
  }
  if (hasTargetBroadcasterContext(input)) {
    return synthetic({
      label: "approved",
      score: 72,
      reasons: ["Intern reporter role at target broadcaster (deterministic)."],
      matched_rules: ["intern_reporter_title", "target_broadcasters"],
    });
  }
  return synthetic({
    label: "rejected",
    score: 15,
    reasons: ["Intern reporter roles are in scope only at target broadcasters."],
    matched_rules: ["intern_reporter_not_target_broadcaster"],
  });
};

const hitsMotorStudioPending = (input: JobFitInput): JobFitResult | null => {
  if (!isMotorStudioCompanyOrTitle(input.company, input.title)) {
    return null;
  }
  return synthetic({
    label: "rejected",
    score: 52,
    reasons: [
      "Motor studio / auto exhibition company — docent or presenter roles may apply; defer to admin review.",
    ],
    matched_rules: ["motor_studio_docent_pending"],
  });
};

/** Non-target roles override target company/role signals. */
const hitsNonTargetRoleReject = (input: JobFitInput): JobFitResult | null => {
  if (!titleHasBroadcasterRejectRole(input.title)) {
    return null;
  }
  if (
    !hasTargetBroadcasterContext(input) &&
    !titleHasJobFitTargetRole(input.title) &&
    !titleHasTargetBroadcastRole(input.title)
  ) {
    return null;
  }
  return synthetic({
    label: "rejected",
    score: 12,
    reasons: ["Target broadcaster context or target-role title, but non-target job duties are present."],
    matched_rules: ["broadcaster_non_target_role"],
  });
};

const hitsBroadcasterRoleGate = (input: JobFitInput): JobFitResult | null => {
  if (!hasTargetBroadcasterContext(input)) {
    return null;
  }
  if (!titleHasJobFitTargetRole(input.title)) {
    return null;
  }
  const companyMatched = companyMatchesBroadcaster(input.company, JOB_FIT_RULES.targetBroadcasters);
  const matchedRules = titleHasTargetBroadcasterMarker(input.title)
    ? ["target_broadcaster_title_marker", "target_roles"]
    : companyMatched
      ? ["target_broadcasters", "target_roles"]
      : ["target_broadcaster_title", "target_roles"];
  return synthetic({
    label: "approved",
    score: 85,
    reasons: ["Target broadcaster company and target role in title (deterministic)."],
    matched_rules: matchedRules,
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

  const showhostGate = hitsShowhostScopeGate(input);
  if (showhostGate) return showhostGate;

  const internReporterGate = hitsInternReporterScopeGate(input);
  if (internReporterGate) return internReporterGate;

  const motorStudioPending = hitsMotorStudioPending(input);
  if (motorStudioPending) return motorStudioPending;

  const nonTargetRoleReject = hitsNonTargetRoleReject(input);
  if (nonTargetRoleReject) return nonTargetRoleReject;

  const broadcasterGate = hitsBroadcasterRoleGate(input);
  if (broadcasterGate) return broadcasterGate;

  const exclusionReject = hitsExclusionKeywordsReject(input);
  if (exclusionReject) return exclusionReject;

  if (input.source === JOB_FIT_INTERN_SOURCE) {
    if (!internHasAllowedKeyword(input)) {
      return synthetic({
        label: "rejected",
        score: 15,
        reasons: ["Intern channel requires at least one of: 기자, 아나운서, 리포터 in title or company."],
        matched_rules: ["intern_allowed_keywords"],
      });
    }
    if (!companyMatchesBroadcaster(input.company, JOB_FIT_RULES.targetBroadcasters)) {
      return synthetic({
        label: "rejected",
        score: 15,
        reasons: ["Intern channel postings require a target broadcaster company."],
        matched_rules: ["intern_channel_not_target_broadcaster"],
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
