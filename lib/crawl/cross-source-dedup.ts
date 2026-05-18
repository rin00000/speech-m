import { normalizeForFingerprintPart } from "@/lib/crawl/fingerprint";

const LEGAL_ENTITY_PATTERN = /\(주\)|㈜|주식회사|\(유\)|\(사\)/gi;

/** 방송·아나운서 채용 제목 관용구 — 길이 내림차순으로 부분 제거. */
export const RECRUITMENT_BOILERPLATE = [
  "공개채용",
  "채용안내",
  "모집안내",
  "신입경력",
  "채용공고",
  "경력무관",
  "모십니다",
  "구합니다",
  "모집",
  "채용",
  "공채",
  "구인",
  "구직",
  "신입",
  "경력",
  "무관",
  "공고",
  "안내",
  "함께",
  "을",
  "를",
  "이",
  "가",
  "의",
  "과",
  "와",
] as const;

const BOILERPLATE_SORTED = [...RECRUITMENT_BOILERPLATE].sort((a, b) => b.length - a.length);

const BOILERPLATE_TOKEN_SET = new Set(
  RECRUITMENT_BOILERPLATE.map((p) => normalizeForFingerprintPart(p).replace(/\s+/g, "")).filter(
    (p) => p.length >= 1
  )
);

const TOKEN_PATTERN = /[a-z0-9]{2,}|[가-힣]{2,}/gi;

export const CROSS_SOURCE_SIMILARITY_THRESHOLD = 0.42;

export type CrossSourceDedupJob = {
  title: string;
  company?: string | null;
  location?: string | null;
  source_url: string;
};

export function normalizeCompanyKey(company: string | null | undefined): string {
  let s = normalizeForFingerprintPart(company);
  s = s.replace(LEGAL_ENTITY_PATTERN, "");
  return s.replace(/\s+/g, "");
}

export function normalizeLocationKey(location: string | null | undefined): string {
  return normalizeForFingerprintPart(location).replace(/\s+/g, "");
}

function stripBoilerplateFromText(text: string): string {
  let s = text;
  for (const phrase of BOILERPLATE_SORTED) {
    const spaced = normalizeForFingerprintPart(phrase);
    const compact = spaced.replace(/\s+/g, "");
    if (spaced) {
      s = s.split(spaced).join(" ");
    }
    if (compact) {
      const compactSrc = s.replace(/\s+/g, "");
      if (compactSrc.includes(compact)) {
        s = compactSrc.split(compact).join(" ");
      }
    }
  }
  return s.replace(/\s+/g, " ").trim();
}

function removeCompanyFromTitle(title: string, companyKey: string): string {
  let s = title;
  if (companyKey) {
    const spaced = companyKey.replace(/(.)/g, "$1\\s*");
    s = s.replace(new RegExp(spaced, "gi"), " ");
  }
  return s;
}

/**
 * 관용구 strip 후 직무 알맹이 토큰만 반환. 유사도는 이 배열만 사용한다.
 */
export function extractTitleCoreTokens(
  title: string,
  companyKey?: string
): string[] {
  let s = normalizeForFingerprintPart(title);
  s = s.replace(/\[[^\]]*]/g, " ").replace(/\([^)]*\)/g, " ");
  s = s.replace(/[/·|,]/g, " ");
  if (companyKey) {
    s = removeCompanyFromTitle(s, companyKey);
  }
  s = stripBoilerplateFromText(s);

  const matches = s.match(TOKEN_PATTERN) ?? [];

  const out = new Set<string>();
  for (const raw of matches) {
    let t = raw.toLowerCase();
    for (const phrase of BOILERPLATE_SORTED) {
      const p = normalizeForFingerprintPart(phrase).replace(/\s+/g, "");
      if (p && t.endsWith(p) && t.length > p.length) {
        t = t.slice(0, -p.length);
      }
    }
    if (t.length < 2) continue;
    if (BOILERPLATE_TOKEN_SET.has(t)) continue;
    out.add(t);
  }
  return [...out];
}

function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 3 || b.length < 3) return false;
  return a.includes(b) || b.includes(a);
}

/** 직무 토큰 집합: exact + 부분 포함(만들어갈/만들어 등) 매칭. */
function coreTokenOverlapSimilarity(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const usedB = new Set<number>();
  let inter = 0;
  for (const ta of a) {
    for (let i = 0; i < b.length; i++) {
      if (usedB.has(i)) continue;
      if (tokensMatch(ta, b[i]!)) {
        inter += 1;
        usedB.add(i);
        break;
      }
    }
  }
  const union = a.length + b.length - inter;
  return union === 0 ? 0 : inter / union;
}

function jaccardSimilarity<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter += 1;
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

function charBigrams(s: string): Set<string> {
  const set = new Set<string>();
  if (s.length < 2) {
    if (s.length === 1) set.add(s);
    return set;
  }
  for (let i = 0; i < s.length - 1; i++) {
    set.add(s.slice(i, i + 2));
  }
  return set;
}

/** core 토큰·core 연결 bigram Jaccard 중 높은 값. */
export function titleSimilarity(
  titleA: string,
  titleB: string,
  companyKey?: string
): number {
  const coreA = extractTitleCoreTokens(titleA, companyKey);
  const coreB = extractTitleCoreTokens(titleB, companyKey);
  if (coreA.length === 0 || coreB.length === 0) return 0;

  const tokenJac = coreTokenOverlapSimilarity(coreA, coreB);
  const joinedA = coreA.join("");
  const joinedB = coreB.join("");
  const bigramJac = jaccardSimilarity(charBigrams(joinedA), charBigrams(joinedB));

  return Math.max(tokenJac, bigramJac);
}

export function isCrossSourceDuplicate(
  incoming: CrossSourceDedupJob,
  candidate: CrossSourceDedupJob,
  options?: { similarityThreshold?: number }
): boolean {
  if (incoming.source_url.trim() === candidate.source_url.trim()) return false;

  const companyKey = normalizeCompanyKey(incoming.company);
  const candidateKey = normalizeCompanyKey(candidate.company);
  if (!companyKey || !candidateKey || companyKey !== candidateKey) return false;

  const locA = incoming.location ? normalizeLocationKey(incoming.location) : "";
  const locB = candidate.location ? normalizeLocationKey(candidate.location) : "";
  if (locA && locB && locA !== locB) return false;

  const sim = titleSimilarity(incoming.title, candidate.title, companyKey);
  return sim >= (options?.similarityThreshold ?? CROSS_SOURCE_SIMILARITY_THRESHOLD);
}

export function matchesAnyCrossSourceDuplicate(
  incoming: CrossSourceDedupJob,
  candidates: readonly CrossSourceDedupJob[],
  options?: { similarityThreshold?: number }
): boolean {
  return candidates.some((c) => isCrossSourceDuplicate(incoming, c, options));
}
