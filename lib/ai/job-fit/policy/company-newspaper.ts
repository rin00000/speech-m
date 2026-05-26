import {
  companyMatchesBlocklist,
  companyMatchesBroadcaster,
  fieldTextMatches,
  foldCase,
} from "./keyword-match";
import {
  JOB_FIT_BROADCASTER_PENDING_ROLE_KEYWORDS,
  JOB_FIT_BROADCASTER_REJECT_ROLE_KEYWORDS,
  JOB_FIT_HOMESHOPPING_APPROVE_ROLES,
  JOB_FIT_HOMESHOPPING_DETECT_MARKERS,
  JOB_FIT_MAJOR_HOMESHOPPING_COMPANIES,
  JOB_FIT_MOTOR_STUDIO_COMPANY_MARKERS,
  JOB_FIT_INTERNET_NEWSPAPER_COMPANY_MARKERS,
  JOB_FIT_INTERNET_NEWSPAPER_EXCLUSION_COMPANIES,
  JOB_FIT_RULES,
  JOB_FIT_TARGET_ROLE_KEYWORDS,
} from "./rules";

const SEGMENT_SPLIT = /[\s,.·…|/&\\\-–—\n]+/;

const normalizeSegment = (seg: string): string =>
  foldCase(seg.replace(/[()（）]/g, "").replace(/[\[\]]/g, ""));

const splitSegments = (text: string): string[] => text.split(SEGMENT_SPLIT).filter(Boolean);

/**
 * Internet/small newspaper: company markers or exclusion list, never when company is a target broadcaster.
 */
export const isInternetSmallNewspaperCompany = (company: string | null | undefined): boolean => {
  if (!company?.trim()) return false;
  if (companyMatchesBroadcaster(company, JOB_FIT_RULES.targetBroadcasters)) return false;
  if (companyMatchesBlocklist(company, JOB_FIT_INTERNET_NEWSPAPER_EXCLUSION_COMPANIES)) {
    return true;
  }
  const folded = foldCase(company);
  return JOB_FIT_INTERNET_NEWSPAPER_COMPANY_MARKERS.some((m) => folded.includes(foldCase(m)));
};

const normalizeTitleForRoleMatch = (title: string): string =>
  title.normalize("NFKC").replace(/\s+/g, " ");

/**
 * Cross-source intern reporter: title must signal both intern and reporter (segment 기자, not 취재기자 alone).
 */
export const titleHasInternReporterRole = (title: string): boolean => {
  const folded = foldCase(normalizeTitleForRoleMatch(title));
  if (folded.includes("인턴 기자") || folded.includes("인턴기자")) {
    return true;
  }
  const hasIntern = splitSegments(title).some((seg) => normalizeSegment(seg) === "인턴");
  const hasReporter = splitSegments(title).some((seg) => normalizeSegment(seg) === "기자");
  return hasIntern && hasReporter;
};

export const isHomeshoppingCompanyOrTitle = (
  company: string | null | undefined,
  title: string
): boolean => {
  const combined = `${title}\n${company ?? ""}`;
  const folded = foldCase(combined);
  return JOB_FIT_HOMESHOPPING_DETECT_MARKERS.some((m) => folded.includes(foldCase(m)));
};

export const companyMatchesMajorHomeshopping = (
  company: string | null | undefined
): boolean => companyMatchesBroadcaster(company ?? null, JOB_FIT_MAJOR_HOMESHOPPING_COMPANIES);

export const titleHasHomeshoppingApproveRole = (title: string): boolean =>
  JOB_FIT_HOMESHOPPING_APPROVE_ROLES.some((kw) => fieldTextMatches(title, kw));

/** targetRoles for broadcaster approve; show-host handled by major homeshopping gate. */
export const titleHasJobFitTargetRole = (title: string): boolean =>
  JOB_FIT_RULES.targetRoles
    .filter((role) => role !== "쇼호스트")
    .some((kw) => fieldTextMatches(title, kw));

export const isMotorStudioCompanyOrTitle = (
  company: string | null | undefined,
  title: string
): boolean => {
  const combined = `${title}\n${company ?? ""}`.normalize("NFKC");
  const folded = foldCase(combined);
  return JOB_FIT_MOTOR_STUDIO_COMPANY_MARKERS.some((m) => folded.includes(foldCase(m)));
};

/** Admin / production-office roles at broadcasters → always rejected. */
export const titleHasBroadcasterRejectRole = (title: string): boolean =>
  JOB_FIT_BROADCASTER_REJECT_ROLE_KEYWORDS.some((kw) => fieldTextMatches(title, kw));

/** VJ / video production roles at broadcasters → HITL pending, not auto-approve. */
export const titleHasBroadcasterPendingRole = (title: string): boolean =>
  JOB_FIT_BROADCASTER_PENDING_ROLE_KEYWORDS.some((kw) => fieldTextMatches(title, kw));

/** Title matches announcer-style TARGET_ROLE (whitelist for newspaper gate). */
export const titleHasTargetBroadcastRole = (title: string): boolean => {
  const segments = splitSegments(title);
  const allowed = new Set(JOB_FIT_TARGET_ROLE_KEYWORDS.map((k) => foldCase(k)));
  if (segments.some((seg) => allowed.has(normalizeSegment(seg)))) {
    return true;
  }
  return JOB_FIT_TARGET_ROLE_KEYWORDS.some((kw) => fieldTextMatches(title, kw));
};
