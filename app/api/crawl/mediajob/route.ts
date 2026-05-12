import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  BASE_FETCH_HEADERS,
  fetchWithRetry,
  parseDeadline,
  poolAllSettled,
  shareInFlightPromise,
  type JobInsert,
} from "@/lib/crawl/shared";
import type { JobSource } from "@/types/database.types";

const BASE_URL = "https://www.mediajob.co.kr";
const CRAWL_PAGES = 2;
const FETCH_CONCURRENCY = 3;

/** Site default list order is 수정일 최신순; URLs below do not override sort. */
type CrawlTarget = {
  label: string;
  source: JobSource;
  buildUrl: (page: number) => string;
};

const CRAWL_TARGETS: CrawlTarget[] = [
  {
    label: "아나운서",
    source: "mediajob_announcer",
    buildUrl: (page) => `${BASE_URL}/recruit/recruit.htm?ctg=exp&exp_lv=2&page=${page}`,
  },
  {
    label: "기자",
    source: "mediajob_reporter",
    buildUrl: (page) => `${BASE_URL}/recruit/recruit.htm?ctg=exp&exp_lv=3&page=${page}`,
  },
  {
    label: "인턴",
    source: "mediajob_intern",
    buildUrl: (page) => `${BASE_URL}/recruit/recruit.htm?ctg=intern&page=${page}`,
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

type MediajobFetchTask = {
  target: CrawlTarget;
  page: number;
  url: string;
};

export async function POST() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const seenRecIdx = new Set<string>();

    const tasks: MediajobFetchTask[] = CRAWL_TARGETS.flatMap((target) =>
      Array.from({ length: CRAWL_PAGES }, (_, i) => {
        const page = i + 1;
        return {
          target,
          page,
          url: target.buildUrl(page),
        };
      })
    );

    const inFlight = new Map<string, Promise<Response>>();
    const results = await poolAllSettled(tasks, FETCH_CONCURRENCY, (task) =>
      shareInFlightPromise(inFlight, task.url, () =>
        fetchWithRetry(task.url, {
          headers: FETCH_HEADERS,
          cache: "no-store",
        })
      )
    );

    const jobs: JobInsert[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const { target, page } = tasks[i];

      if (result.status === "rejected") {
        console.warn(`[crawl/mediajob] ${target.label} page ${page} 요청 실패:`, result.reason);
        continue;
      }
      if (!result.value.ok) {
        console.warn(`[crawl/mediajob] ${target.label} page ${page} 요청 실패: HTTP ${result.value.status}`);
        continue;
      }

      const html = await result.value.text();
      const pageJobs = parseJobsFromHtml(html, seenRecIdx, target.source, today);
      jobs.push(...pageJobs);
    }

    if (jobs.length === 0) {
      return NextResponse.json(
        { error: "파싱 실패: 공고를 찾을 수 없습니다. 사이트 구조가 변경됐을 수 있습니다." },
        { status: 422 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("job_postings")
      .upsert(jobs, { onConflict: "source_url", ignoreDuplicates: true })
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      saved: data?.length ?? 0,
      total: jobs.length,
    });
  } catch (err) {
    console.error("[crawl/mediajob]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
