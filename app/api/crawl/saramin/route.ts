import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import { collectJobsWithConsecutiveDupStop } from "@/lib/crawl/incremental-pages";
import { persistCrawlBatch } from "@/lib/crawl/persist-crawl-batch";
import {
  BASE_FETCH_HEADERS,
  fetchWithRetry,
  parseDeadline,
  shareInFlightPromise,
  type JobInsert,
} from "@/lib/crawl/shared";
import { createAdminClient } from "@/lib/supabase/server";

const BASE_URL = "https://www.saramin.co.kr";
const CRAWL_PAGES = 1;

// 기자, 도슨트, 리포터, 기상캐스터, 성우, 쇼호스트, 큐레이터, 아나운서, MC
const CAT_KEWD = "1295,1283,1284,1290,1294,1289,1285,1322,1307";

/** `sort=MD`: 수정순(수정·끌어올림 반영 최신). `RD`는 등록일 기준 최신. `page_count=20`: 20개씩. */
const buildUrl = (page: number) =>
  `${BASE_URL}/zf_user/jobs/list/job-category?cat_kewd=${encodeURIComponent(CAT_KEWD)}&panel_type=&search_optional_item=n&search_done=y&panel_count=y&preview=y&sort=MD&page=${page}&page_count=20`;

const FETCH_HEADERS = {
  ...BASE_FETCH_HEADERS,
  Referer: `${BASE_URL}/zf_user/jobs/list/job-category`,
};

function parseJobsFromHtml(
  html: string,
  seenRecIdx: Set<string>,
  today: Date
): JobInsert[] {
  const $ = cheerio.load(html);
  const jobs: JobInsert[] = [];

  // [id^="rec-"] 로 직접 job 컨테이너 선택 — id에서 rec_idx 바로 추출
  $("[id^='rec-']").each((_, el) => {
    const $el = $(el);
    const recIdx = ($el.attr("id") ?? "").replace("rec-", "");

    if (!recIdx || seenRecIdx.has(recIdx)) return;
    seenRecIdx.add(recIdx);

    const titleEl = $el.find("div.job_tit a.str_tit").first();
    const title =
      titleEl.attr("title")?.trim() ||
      titleEl.find("span").first().text().trim();
    if (!title) return;

    const sourceUrl = `${BASE_URL}/zf_user/jobs/relay/view?rec_idx=${recIdx}`;

    // 회사명 — 링크(a) 우선, 없으면 텍스트(span)
    const company =
      $el.find("div.col.company_nm a.str_tit").first().text().trim() ||
      $el.find("div.col.company_nm span.str_tit").first().text().trim() ||
      null;

    const location = $el.find("p.work_place").first().text().trim() || null;

    const deadlineRaw = $el
      .find("p.support_detail span.date")
      .first()
      .text()
      .trim();
    const deadline = deadlineRaw ? parseDeadline(deadlineRaw, today) : null;

    jobs.push({
      title,
      company,
      location,
      source: "saramin",
      source_url: sourceUrl,
      status: "pending",
      deadline,
    });
  });

  return jobs;
}

export async function POST() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const supabase = createAdminClient();
    const seenRecIdx = new Set<string>();
    const inFlight = new Map<string, Promise<Response>>();
    const pageNumbers = Array.from({ length: CRAWL_PAGES }, (_, i) => i + 1);

    const jobs = await collectJobsWithConsecutiveDupStop(supabase, {
      pageNumbers,
      loadPage: async (page) => {
        const url = buildUrl(page);
        const result = await shareInFlightPromise(inFlight, url, () =>
          fetchWithRetry(url, { headers: FETCH_HEADERS, cache: "no-store" })
        );

        if (!result.ok) {
          console.warn(`[crawl/saramin] page ${page} 요청 실패: HTTP ${result.status}`);
          return [];
        }

        const html = await result.text();
        return parseJobsFromHtml(html, seenRecIdx, today);
      },
    });

    if (jobs.length === 0) {
      return NextResponse.json(
        {
          error:
            "파싱 실패: 공고를 찾을 수 없습니다. 사이트 구조가 변경됐을 수 있습니다.",
        },
        { status: 422 }
      );
    }

    const persist = await persistCrawlBatch(supabase, jobs);
    const saved = persist.inserted + persist.updated;

    return NextResponse.json({
      success: true,
      saved,
      inserted: persist.inserted,
      updated: persist.updated,
      total: jobs.length,
      skipped_blocked: persist.skipped_blocked,
      skipped_fingerprint_dup: persist.skipped_fingerprint_dup,
      skipped_cross_source_dup: persist.skipped_cross_source_dup,
    });
  } catch (err) {
    console.error("[crawl/saramin]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
