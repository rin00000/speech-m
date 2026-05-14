import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchExistingSourceUrls } from "@/lib/crawl/crawl-db-lookup";
import { resolveMaxConsecutiveDuplicateUrls } from "@/lib/crawl/fingerprint";
import type { JobInsert } from "@/lib/crawl/shared";
import type { Database } from "@/types/database.types";

type AdminClient = SupabaseClient<Database>;

/**
 * 페이지를 순서대로 가져오며, DB에 이미 있는 source_url이 연속으로 N번 나오면 이후 페이지 요청을 생략한다.
 * 현재 페이지는 항상 끝까지 소비한 뒤 종료한다(동일 페이지 하단 신규 공고 방어).
 */
export async function collectJobsWithConsecutiveDupStop(
  supabase: AdminClient,
  options: {
    pageNumbers: readonly number[];
    loadPage: (page: number) => Promise<JobInsert[]>;
    maxConsecutive?: number;
  }
): Promise<JobInsert[]> {
  const max = options.maxConsecutive ?? resolveMaxConsecutiveDuplicateUrls();
  const all: JobInsert[] = [];
  let consecutive = 0;

  for (const page of options.pageNumbers) {
    const pageJobs = await options.loadPage(page);
    if (pageJobs.length === 0) continue;

    const existSet = await fetchExistingSourceUrls(
      supabase,
      pageJobs.map((j) => j.source_url)
    );

    let exitAfterThisPage = false;
    for (const job of pageJobs) {
      all.push(job);
      if (existSet.has(job.source_url)) {
        consecutive += 1;
        if (consecutive >= max) {
          exitAfterThisPage = true;
        }
      } else {
        consecutive = 0;
      }
    }

    if (exitAfterThisPage) {
      break;
    }
  }

  return all;
}
