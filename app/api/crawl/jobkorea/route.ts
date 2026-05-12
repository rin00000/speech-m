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

const BASE_URL = "https://www.jobkorea.co.kr";
const ENDPOINT = `${BASE_URL}/Recruit/Home/_GI_List/`;
const REFERER = `${BASE_URL}/recruit/joblist?menucode=duty`;

// 기자, 아나운서, 리포터·성우, MC·쇼호스트
const DUTY_CODES = ["1000395", "1000397", "1000398", "1000399"] as const;
const CRAWL_PAGES = 2;
const FETCH_CONCURRENCY = 2;
/** Matches JobKorea `orderTab`: 3 = 최신업데이트순 (2 = 등록일순). */
const PAGE_SIZE = 20;

const buildBody = (page: number) =>
  new URLSearchParams({
    isDefault: "true",
    "condition[duty]": DUTY_CODES.join(","),
    "condition[menucode]": "",
    page: String(page),
    direct: "0",
    order: "3",
    pagesize: String(PAGE_SIZE),
    tabindex: "0",
    onePick: "0",
    confirm: "0",
    profile: "0",
  });

const FETCH_HEADERS = {
  ...BASE_FETCH_HEADERS,
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  "X-Requested-With": "XMLHttpRequest",
  Origin: BASE_URL,
  Referer: REFERER,
  Accept: "text/html, */*; q=0.01",
};

function parseJobsFromHtml(
  html: string,
  seenGno: Set<string>,
  today: Date
): JobInsert[] {
  const $ = cheerio.load(html);
  const jobs: JobInsert[] = [];

  $("tr.devloopArea[data-gno]").each((_, el) => {
    const $el = $(el);
    const gno = ($el.attr("data-gno") ?? "").trim();
    if (!gno || seenGno.has(gno)) return;
    seenGno.add(gno);

    const titleEl = $el.find("td.tplTit div.titBx strong a").first();
    const title =
      titleEl.attr("title")?.trim() || titleEl.text().trim();
    if (!title) return;

    const sourceUrl = `${BASE_URL}/Recruit/GI_Read/${gno}`;

    const company =
      $el.find("td.tplCo > a").first().text().trim() || null;

    // p.etc span.cell 순서: 경력 / 학력 / 지역 / 고용형태 — 3번째가 지역
    const location =
      $el.find("td.tplTit p.etc span.cell").eq(2).text().trim() || null;

    const deadlineRaw = $el
      .find("td.odd span.date")
      .first()
      .text()
      .replace(/\s+/g, "")
      .trim();
    const deadline = deadlineRaw ? parseDeadline(deadlineRaw, today) : null;

    jobs.push({
      title,
      company,
      location,
      source: "jobkorea",
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

    const seenGno = new Set<string>();
    const inFlight = new Map<string, Promise<Response>>();
    const pages = Array.from({ length: CRAWL_PAGES }, (_, i) => i + 1);

    const results = await poolAllSettled(pages, FETCH_CONCURRENCY, (page) =>
      shareInFlightPromise(inFlight, `POST:${ENDPOINT}:page=${page}`, () =>
        fetchWithRetry(ENDPOINT, {
          method: "POST",
          headers: FETCH_HEADERS,
          body: buildBody(page),
          cache: "no-store",
        })
      )
    );

    const jobs: JobInsert[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const page = i + 1;

      if (result.status === "rejected") {
        console.warn(`[crawl/jobkorea] page ${page} 요청 실패:`, result.reason);
        continue;
      }
      if (!result.value.ok) {
        console.warn(
          `[crawl/jobkorea] page ${page} 요청 실패: HTTP ${result.value.status}`
        );
        continue;
      }

      const html = await result.value.text();
      const pageJobs = parseJobsFromHtml(html, seenGno, today);
      jobs.push(...pageJobs);
    }

    if (jobs.length === 0) {
      return NextResponse.json(
        {
          error:
            "파싱 실패: 공고를 찾을 수 없습니다. 사이트 구조가 변경됐을 수 있습니다.",
        },
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
    console.error("[crawl/jobkorea]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
