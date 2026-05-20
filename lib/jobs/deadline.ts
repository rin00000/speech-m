import { TEXT_DEADLINE } from "@/lib/crawl/shared";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const getTodayIso = (today: Date = new Date()): string =>
  startOfDay(today).toISOString().slice(0, 10);

export const isExpiredDeadline = (
  deadline: string | null | undefined,
  today: Date = new Date(),
): boolean => {
  if (!deadline) return false;
  if (TEXT_DEADLINE.has(deadline)) return false;
  if (!ISO_DATE_RE.test(deadline)) return false;
  const d = startOfDay(new Date(`${deadline}T00:00:00`));
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < startOfDay(today).getTime();
};

/**
 * PostgREST `.or()`에 그대로 넣을 수 있는 "만료가 아닌" 조건식.
 * - deadline IS NULL  → 유효
 * - deadline >= today (ISO·텍스트 모두 한글이 ISO보다 정렬상 크므로 통과)
 */
export const activeDeadlineOrExpression = (today: Date = new Date()): string => {
  const iso = getTodayIso(today);
  return `deadline.is.null,deadline.gte.${iso}`;
};
