import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import { collectJobsWithConsecutiveDupStop } from "@/lib/crawl/incremental-pages";
import { persistCrawlBatch } from "@/lib/crawl/persist-crawl-batch";
import { createAdminClient } from "@/lib/supabase/server";
import {
  BASE_FETCH_HEADERS,
  fetchWithRetry,
  parseDeadline,
  shareInFlightPromise,
  type JobInsert,
} from "@/lib/crawl/shared";
import type { JobSource } from "@/types/database.types";

const BASE_URL = "https://www.mediajob.co.kr";
const CRAWL_PAGES = 2;
const FETCH_CONCURRENCY = 3;

/**
 * 목록 정렬: 리스트 폼의 `SF=upd_date`(수정일순) + 페이지 이동 시와 동일하게 `moveTo=Y`.
 * 사이트 JS `sort('upd_date','ASC')`와 동일 계열.
 */
const LIST_SORT_QUERY = "SF=upd_date&moveTo=Y" as const;

type CrawlTarget = {
  label: string;
  source: JobSource;
  buildUrl: (page: number) => string;
};

const CRAWL_TARGETS: CrawlTarget[] = [
  {
    label: "아나운서",
    source: "mediajob_announcer",
    buildUrl: (page) =>
      `${BASE_URL}/recruit/recruit.htm?ctg=exp&exp_lv=2&page=${page}&${LIST_SORT_QUERY}`,
  },
  {
    label: "기자",
    source: "mediajob_reporter",
    buildUrl: (page) =>
      `${BASE_URL}/recruit/recruit.htm?ctg=exp&exp_lv=3&page=${page}&${LIST_SORT_QUERY}`,
  },
  {
    label: "인턴",
    source: "mediajob_intern",
    buildUrl: (page) =>
      `${BASE_URL}/recruit/recruit.htm?ctg=intern&page=${page}&${LIST_SORT_QUERY}`,
  },
];

const FETCH_HEADERS = {
  ...BASE_FETCH_HEADERS,
  Referer: BASE_URL,
};

function parseJobsFromHtml(html: string, seenRecIdx: Set<string>, source: JobSource, today: Date): JobInsert[] {
  const $ = cheerio.load(html);
  const jobs: JobInsert[] = [];

  // #list_06 범위
  $("#list_06 > dl > dd > div.list_content li").each((_, el) => {
    const $el = $(el);
    const titleLink = $el.find("div.cell_mid div.cl_top a").first();
    const href = titleLink.attr("href") ?? "";
    const recIdxMatch = href.match(/rec_idx=(\d+)/);
    if (!recIdxMatch) return;

    const recIdx = recIdxMatch[1];
    if (seenRecIdx.has(recIdx)) return;
    seenRecIdx.add(recIdx);

    const sourceUrl = `${BASE_URL}/recruit/recruit.htm?cmd=view&rec_idx=${recIdx}`;
    const title = titleLink.text().trim();
    if (!title) return;

    const company     = $el.find("div.cell_first label span").first().text().trim() || null;
    const location    = $el.find("span.ico_area").first().text().trim() || null;
    const deadlineRaw = $el.find("div.cell_date").first().text().trim() || null;
    const deadline    = deadlineRaw ? parseDeadline(deadlineRaw, today) : null;

    jobs.push({
      title,
      company,
      location,
      source,
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

    const crawlOneTarget = async (target: (typeof CRAWL_TARGETS)[number]) => {
      return collectJobsWithConsecutiveDupStop(supabase, {
        pageNumbers,
        loadPage: async (page) => {
          const url = target.buildUrl(page);
          const result = await shareInFlightPromise(inFlight, url, () =>
            fetchWithRetry(url, {
              headers: FETCH_HEADERS,
              cache: "no-store",
            })
          );

          if (!result.ok) {
            console.warn(`[crawl/mediajob] ${target.label} page ${page} 요청 실패: HTTP ${result.status}`);
            return [];
          }

          const html = await result.text();
          return parseJobsFromHtml(html, seenRecIdx, target.source, today);
        },
      });
    };

    const targetChunks: CrawlTarget[][] = [];
    for (let i = 0; i < CRAWL_TARGETS.length; i += FETCH_CONCURRENCY) {
      targetChunks.push(CRAWL_TARGETS.slice(i, i + FETCH_CONCURRENCY));
    }

    const jobs: JobInsert[] = [];
    for (const chunk of targetChunks) {
      const parts = await Promise.all(chunk.map((t) => crawlOneTarget(t)));
      for (const part of parts) {
        jobs.push(...part);
      }
    }

    if (jobs.length === 0) {
      return NextResponse.json(
        { error: "파싱 실패: 공고를 찾을 수 없습니다. 사이트 구조가 변경됐을 수 있습니다." },
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
    });
  } catch (err) {
    console.error("[crawl/mediajob]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
