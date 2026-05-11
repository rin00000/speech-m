import type { Database } from "@/types/database.types";
import { SOURCE_LABEL } from "@/lib/jobs/constants";

type JobPosting = Database["public"]["Tables"]["job_postings"]["Row"];

type NaverSharePayload = Pick<JobPosting, "title" | "company" | "location" | "deadline" | "source" | "source_url">;

const NAVER_SHARE_BASE_URL = "https://share.naver.com/web/shareView";

const buildBlogTitle = ({ title, company }: Pick<NaverSharePayload, "title" | "company">): string => {
  const companyName = company?.trim() || "미정";
  return `[채용] ${companyName} ${title.trim()}`;
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

export const buildNaverShareUrl = (job: NaverSharePayload): string => {
  const title = buildBlogTitle(job);
  const params = new URLSearchParams({
    url: job.source_url,
    title,
  });
  return `${NAVER_SHARE_BASE_URL}?${params.toString()}`;
};
