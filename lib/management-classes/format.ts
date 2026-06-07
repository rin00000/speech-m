export const MANAGEMENT_CLASS_CANCEL_CUTOFF_HOURS = 1;

const seoulDateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const seoulShortDateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function parseSeoulDateTimeLocal(value: string) {
  const normalized = value.trim();
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) return null;

  const [, year, month, day, hour, minute, second = "00"] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`);
  if (!Number.isFinite(date.getTime())) return null;

  return date.toISOString();
}

export function formatManagementClassDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "일정 미정";
  return seoulDateTimeFormatter.format(date);
}

export function formatManagementClassShortDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "일정 미정";
  return seoulShortDateTimeFormatter.format(date);
}

export function formatCouponLabel(sequenceNumber: number, totalCount: number) {
  return `${sequenceNumber}/${totalCount}`;
}

export function canStudentCancelManagementClass(startsAt: string, now = Date.now()) {
  const startsAtTime = new Date(startsAt).getTime();
  if (!Number.isFinite(startsAtTime)) return false;

  return startsAtTime - now > MANAGEMENT_CLASS_CANCEL_CUTOFF_HOURS * 60 * 60 * 1000;
}

export function getManagementClassCancelClosesAt(startsAt: string) {
  const startsAtTime = new Date(startsAt).getTime();
  if (!Number.isFinite(startsAtTime)) return null;

  return new Date(
    startsAtTime - MANAGEMENT_CLASS_CANCEL_CUTOFF_HOURS * 60 * 60 * 1000,
  ).toISOString();
}
