/** Case-insensitive comparison for Latin; Korean unchanged after lower (sufficient for our keywords). */
export const foldCase = (s: string): string => s.toLowerCase();

export const SHORT_ASCII_MAX_LEN = 4;

/** True if keyword is ASCII letters/digits only and short (token / Latin-run match). */
export const isShortAsciiKeyword = (keyword: string): boolean => {
  const t = keyword.trim();
  return t.length > 0 && t.length <= SHORT_ASCII_MAX_LEN && /^[a-z0-9]+$/i.test(t);
};

/** Extract contiguous Latin digit runs for short-token matching (avoids `ad` inside `head`). */
export const latinRuns = (field: string): string[] => {
  const m = foldCase(field).match(/[a-z0-9]+/g);
  return m ?? [];
};

/**
 * Match keyword against a field: substring for Hangul / long ASCII / phrases;
 * whole Latin run equality for short ASCII-only keywords.
 */
export const fieldTextMatches = (field: string, keyword: string): boolean => {
  const kw = keyword.trim();
  if (!kw) return false;

  if (isShortAsciiKeyword(kw)) {
    const run = foldCase(kw);
    return latinRuns(field).some((r) => r === run);
  }

  return foldCase(field).includes(foldCase(kw));
};

/** Company contains any broadcaster needle (substring, case-insensitive Latin). */
export const companyMatchesBroadcaster = (company: string | null, broadcasters: readonly string[]): boolean => {
  if (!company) return false;
  const c = foldCase(company);
  return broadcasters.some((b) => c.includes(foldCase(b)));
};

export const companyMatchesBlocklist = (company: string | null, needles: readonly string[]): boolean => {
  if (!company) return false;
  const c = foldCase(company);
  for (const n of needles) {
    const raw = n.trim();
    if (!raw) continue;
    if (raw === "206") {
      if (/(^|[^0-9])206([^0-9]|$)/.test(c)) return true;
      continue;
    }
    if (isShortAsciiKeyword(raw)) {
      if (latinRuns(company).some((r) => r === foldCase(raw))) return true;
      continue;
    }
    if (foldCase(company).includes(foldCase(raw))) return true;
  }
  return false;
};

export const titleMatchesAnyKeyword = (title: string, keywords: readonly string[]): boolean =>
  keywords.some((k) => fieldTextMatches(title, k));
