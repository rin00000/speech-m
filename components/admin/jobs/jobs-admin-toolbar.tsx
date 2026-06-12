/**
 * 공고 관리 페이지의 수동 등록과 동기화 실행 영역.
 * 목록/필터 UI와 독립된 운영 액션만 모아 페이지 구조를 단순하게 유지한다.
 */

import { AiFitButton } from "@/components/admin/ai/ai-fit-button";
import { CrawlButton } from "@/components/admin/crawl/crawl-button";
import { ManualJobForm } from "./manual-job-form";

export function JobsAdminToolbar() {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
        <CrawlButton source="mediajob" label="미디어잡 즉시 동기화" />
        <CrawlButton source="saramin" label="사람인 즉시 동기화" />
        <CrawlButton source="jobkorea" label="잡코리아 즉시 동기화" />
        <AiFitButton />
      </div>

      <div className="flex lg:shrink-0 lg:justify-end">
        <ManualJobForm />
      </div>
    </div>
  );
}
