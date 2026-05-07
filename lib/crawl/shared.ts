import type { JobSource } from "@/types/database.types";

export type JobInsert = {
  title: string;
  company?: string | null;
  location?: string | null;
  source: JobSource;
  source_url: string;
  status: "pending";
  deadline?: string | null;
};

export const TEXT_DEADLINE = new Set([
  "채용시까지",
  "상시채용",
  "급구",
  "오늘마감",
  "내일마감",
  "모레마감",
]);

/**
 * 마감일 문자열 → ISO 날짜 문자열 (YYYY-MM-DD) 변환.
 * 텍스트 형식(상시채용 등)은 그대로 반환, 파싱 불가 시 null.
 */
export function parseDeadline(raw: string, today: Date): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (TEXT_DEADLINE.has(t)) return t;

  const mmddToIso = (month: number, day: number): string => {
    const d = new Date(today.getFullYear(), month - 1, day);
    if (d < today) d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  };

  // 사람인: ~MM.DD(요일)
  const saraminDate = t.match(/~(\d{2})\.(\d{2})/);
  if (saraminDate)
    return mmddToIso(parseInt(saraminDate[1]), parseInt(saraminDate[2]));

  // 미디어잡: D-N (~MM/DD) — 괄호 안 날짜 우선
  const embeddedDate = t.match(/\(~(\d{2})\/(\d{2})\)/);
  if (embeddedDate)
    return mmddToIso(parseInt(embeddedDate[1]), parseInt(embeddedDate[2]));

  // 공통: D-N
  const dDaysMatch = t.match(/D-(\d+)/);
  if (dDaysMatch) {
    const d = new Date(today);
    d.setDate(d.getDate() + parseInt(dDaysMatch[1]));
    return d.toISOString().slice(0, 10);
  }

  // 미디어잡: MM/DD(요일)
  const mmddMatch = t.match(/^(\d{2})\/(\d{2})/);
  if (mmddMatch)
    return mmddToIso(parseInt(mmddMatch[1]), parseInt(mmddMatch[2]));

  return null;
}

export const BASE_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "ko-KR,ko;q=0.9",
} as const;
