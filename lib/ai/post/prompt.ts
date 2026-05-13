import { buildBlogContent } from "@/lib/jobs/naver-share";
import type { Database } from "@/types/database.types";

/** `buildBlogContent`에 넘길 최소 필드. */
type JobFacts = Pick<
  Database["public"]["Tables"]["job_postings"]["Row"],
  "title" | "company" | "location" | "deadline" | "source" | "source_url"
>;

/**
 * AI Post 1단계: 외부 LLM에 붙여 넣어 게시 초안을 만들 때 쓰는 한국어 지시문 + 사실 블록.
 * 네트워크 호출 없음(클라이언트/서버 어디서든 순수 함수).
 */
export const buildJobPostDraftPrompt = (job: JobFacts): string => {
  const facts = buildBlogContent(job);
  return [
    "당신은 한국어 방송·미디어 채용 소식을 다루는 에디터입니다.",
    "아래 사실 정보만 사용해, 네이버 블로그·SNS에 올릴 수 있는 짧은 홍보 글(도입 1문단, 핵심 조건 bullet 2~4줄, 마무리 1문단)을 작성하세요.",
    "과장·허위는 금지이며, 원문 지원 링크는 반드시 그대로 포함하세요.",
    "",
    "[사실 정보]",
    facts,
  ].join("\n");
};
