import type { Database } from "@/types/database.types";
import { SOURCE_LABEL } from "@/lib/jobs/constants";

type JobPosting = Database["public"]["Tables"]["job_postings"]["Row"];

export type NaverSharePayload = Pick<
  JobPosting,
  "title" | "company" | "location" | "deadline" | "source" | "source_url"
>;

export type NaverShareJob = NaverSharePayload & Pick<JobPosting, "id">;

const NAVER_SHARE_BASE_URL = "https://share.naver.com/web/shareView";

/** Title used for share landing meta, Naver `title` param, and `<h1>`. */
export const buildJobShareTitle = ({ title, company }: Pick<NaverSharePayload, "title" | "company">): string => {
  const companyName = company?.trim() || "미정";
  return `[채용] ${companyName} ${title.trim()}`;
};

export const buildJobSharePagePath = (id: string): string => `/jobs/${id}/share`;

/** Single-line / length-capped text for `<meta name="description">` and `og:description`. */
export const buildJobShareMetaDescription = (job: NaverSharePayload, maxChars = 280): string => {
  const flat = buildBlogContent(job)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (flat.length <= maxChars) return flat;
  return `${flat.slice(0, Math.max(0, maxChars - 1))}…`;
};

const normalize = (value: string | null, fallback = "미정"): string => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
};

export const buildBlogContent = (job: NaverSharePayload): string => {
  const lines = [
    `${normalize(job.company)}에서 ${job.title.trim()} 포지션을 채용 중입니다.`,
    "",
    `- 직무: ${job.title.trim()}`,
    `- 근무지: ${normalize(job.location)}`,
    `- 마감일: ${normalize(job.deadline, "상시채용")}`,
    `- 지원 링크: ${job.source_url}`,
    `- 출처: ${SOURCE_LABEL[job.source]}`,
    "",
    "#채용 #취업 #방송 #미디어",
  ];

  return lines.join("\n");
};

/**
 * Naver shareView `url` = 본문에 삽입되는 링크. 원문 채용 페이지(`source_url`)를 쓴다.
 * `source_url`이 비어 있을 때만 내부 `/jobs/[id]/share` 랜딩으로 폴백한다.
 */
export const buildNaverShareUrl = (job: NaverShareJob, siteOrigin: string): string => {
  const origin = siteOrigin.replace(/\/$/, "");
  const landingUrl = `${origin}${buildJobSharePagePath(job.id)}`;
  const bodyLink = job.source_url?.trim() ? job.source_url.trim() : landingUrl;
  const title = buildJobShareTitle(job);
  const params = new URLSearchParams({
    url: bodyLink,
    title,
  });
  return `${NAVER_SHARE_BASE_URL}?${params.toString()}`;
};
