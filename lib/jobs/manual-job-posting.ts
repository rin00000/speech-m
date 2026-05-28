import { z } from "zod";
import { computeJobFingerprint } from "@/lib/crawl/fingerprint";
import type { Database } from "@/types/database.types";

/**
 * 채용공고 수동 등록 입력을 검증하고 DB insert payload로 변환한다.
 * UI와 Server Action이 같은 정규화 규칙을 공유하도록 이 모듈에 모은다.
 */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const URL_WITH_SCHEME_RE = /^[a-z][a-z0-9+.-]*:\/\//i;
const KOREA_TIME_ZONE = "Asia/Seoul";

export const manualJobPostingInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "공고명을 입력해 주세요.")
    .max(200, "공고명은 200자 이하로 입력해 주세요."),
  company: z
    .string()
    .trim()
    .min(1, "회사명을 입력해 주세요.")
    .max(120, "회사명은 120자 이하로 입력해 주세요."),
  sourceUrl: z
    .string()
    .trim()
    .min(1, "원문 URL을 입력해 주세요.")
    .max(2000, "원문 URL은 2000자 이하로 입력해 주세요."),
  location: z
    .string()
    .trim()
    .max(120, "지역은 120자 이하로 입력해 주세요.")
    .optional()
    .default(""),
  deadline: z
    .string()
    .trim()
    .max(10, "마감일은 YYYY-MM-DD 형식으로 입력해 주세요.")
    .optional()
    .default(""),
});

export type ManualJobPostingInput = z.input<typeof manualJobPostingInputSchema>;
export type ManualJobPostingPayload = Database["public"]["Tables"]["job_postings"]["Insert"];
export type ManualJobPostingField = keyof ManualJobPostingInput;
export type ManualJobPostingFieldErrors = Partial<Record<ManualJobPostingField, string>>;

export type NormalizedManualJobPostingInput = {
  title: string;
  company: string;
  sourceUrl: string;
  location: string | null;
  deadline: string | null;
};

export type BuildManualJobPostingPayloadResult =
  | {
      success: true;
      data: NormalizedManualJobPostingInput;
      payload: ManualJobPostingPayload;
    }
  | {
      success: false;
      error: string;
      fieldErrors: ManualJobPostingFieldErrors;
    };

const manualJobPostingFields = new Set<ManualJobPostingField>([
  "title",
  "company",
  "sourceUrl",
  "location",
  "deadline",
]);

function isManualJobPostingField(value: unknown): value is ManualJobPostingField {
  return typeof value === "string" && manualJobPostingFields.has(value as ManualJobPostingField);
}

function toFieldErrors(error: z.ZodError): ManualJobPostingFieldErrors {
  const fieldErrors: ManualJobPostingFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (isManualJobPostingField(field) && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

function firstFieldError(fieldErrors: ManualJobPostingFieldErrors): string {
  return (
    fieldErrors.title ??
    fieldErrors.company ??
    fieldErrors.sourceUrl ??
    fieldErrors.location ??
    fieldErrors.deadline ??
    "입력값을 확인해 주세요."
  );
}

export function getKoreaTodayIso(today: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KOREA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(today);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("오늘 날짜를 계산할 수 없습니다.");
  }

  return `${year}-${month}-${day}`;
}

export function normalizeManualJobUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const candidate = URL_WITH_SCHEME_RE.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("원문 URL 형식이 올바르지 않습니다.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("원문 URL은 http 또는 https 주소만 입력할 수 있습니다.");
  }
  if (!url.hostname) {
    throw new Error("원문 URL에 도메인을 포함해 주세요.");
  }

  return url.toString();
}

export function normalizeManualJobDeadline(rawDeadline: string, today: Date = new Date()): string | null {
  const deadline = rawDeadline.trim();
  if (!deadline) return null;

  if (!ISO_DATE_RE.test(deadline)) {
    throw new Error("마감일은 YYYY-MM-DD 형식으로 입력해 주세요.");
  }

  const date = new Date(`${deadline}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== deadline) {
    throw new Error("존재하지 않는 마감일입니다.");
  }

  if (deadline < getKoreaTodayIso(today)) {
    throw new Error("마감일은 오늘 이후 날짜로 입력해 주세요.");
  }

  return deadline;
}

export function buildManualJobPostingPayload(
  input: ManualJobPostingInput,
  today: Date = new Date()
): BuildManualJobPostingPayloadResult {
  const parsed = manualJobPostingInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error);
    return {
      success: false,
      error: firstFieldError(fieldErrors),
      fieldErrors,
    };
  }

  const fieldErrors: ManualJobPostingFieldErrors = {};
  let sourceUrl = "";
  let deadline: string | null = null;

  try {
    sourceUrl = normalizeManualJobUrl(parsed.data.sourceUrl);
  } catch (error) {
    fieldErrors.sourceUrl = error instanceof Error ? error.message : "원문 URL 형식이 올바르지 않습니다.";
  }

  try {
    deadline = normalizeManualJobDeadline(parsed.data.deadline, today);
  } catch (error) {
    fieldErrors.deadline = error instanceof Error ? error.message : "마감일을 확인해 주세요.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: firstFieldError(fieldErrors),
      fieldErrors,
    };
  }

  const data: NormalizedManualJobPostingInput = {
    title: parsed.data.title,
    company: parsed.data.company,
    sourceUrl,
    location: parsed.data.location || null,
    deadline,
  };

  return {
    success: true,
    data,
    payload: {
      title: data.title,
      company: data.company,
      location: data.location,
      source: "custom",
      source_url: data.sourceUrl,
      status: "approved",
      deadline: data.deadline,
      published_at: null,
      rejected_at: null,
      fingerprint: computeJobFingerprint(data.company, data.title),
      ai_fit_snapshot: null,
    },
  };
}
