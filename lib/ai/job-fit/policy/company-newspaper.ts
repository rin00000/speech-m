import {
  companyMatchesBlocklist,
  companyMatchesBroadcaster,
  fieldTextMatches,
  foldCase,
  isShortAsciiKeyword,
} from "./keyword-match";
import {
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

/** Title matches announcer-style TARGET_ROLE (whitelist for newspaper gate). */
export const titleHasTargetBroadcastRole = (title: string): boolean => {
  const segments = splitSegments(title);
  const allowed = new Set(JOB_FIT_TARGET_ROLE_KEYWORDS.map((k) => foldCase(k)));
  if (segments.some((seg) => allowed.has(normalizeSegment(seg)))) {
    return true;
  }
  return JOB_FIT_TARGET_ROLE_KEYWORDS.some((kw) => fieldTextMatches(title, kw));
};
