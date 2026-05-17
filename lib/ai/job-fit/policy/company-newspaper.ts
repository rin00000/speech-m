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

/** Title matches announcer-style TARGET_ROLE (whitelist for newspaper gate). */
export const titleHasTargetBroadcastRole = (title: string): boolean => {
  const segments = splitSegments(title);
  const allowed = new Set(JOB_FIT_TARGET_ROLE_KEYWORDS.map((k) => foldCase(k)));
  if (segments.some((seg) => allowed.has(normalizeSegment(seg)))) {
    return true;
  }
  return JOB_FIT_TARGET_ROLE_KEYWORDS.some((kw) => fieldTextMatches(title, kw));
};
