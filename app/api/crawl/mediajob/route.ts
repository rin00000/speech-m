import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import type { JobSource, JobStatus } from "@/types/database.types";

type JobInsert = {
  title: string;
  company?: string | null;
  location?: string | null;
  source: JobSource;
  source_url: string;
  status?: JobStatus;
  content?: string | null;
  deadline?: string | null;
  published_at?: string | null;
};

const BASE_URL = "https://www.mediajob.co.kr";
const CRAWL_URL = `${BASE_URL}/recruit/recruit.htm?ctg=exp&exp_lv=2`;

const REGION_PREFIXES = [
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "대전",
  "광주",
  "울산",
  "세종",
  "강원",
  "경남",
  "경북",
  "전남",
  "전북",
  "충남",
  "충북",
  "제주",
  "전국",
  "해외",
];

function parseDeadline(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (["채용시까지", "상시채용", "급구"].includes(t)) return t;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (t === "내일마감") {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  // D-N format (may include embedded date like "D-12 (~05/18)")
  const embeddedDate = t.match(/\(~(\d{2})\/(\d{2})\)/);
  if (embeddedDate) {
    const month = parseInt(embeddedDate[1]);
    const day = parseInt(embeddedDate[2]);
    const d = new Date(today.getFullYear(), month - 1, day);
    if (d < today) d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }

  const dDaysMatch = t.match(/D-(\d+)/);
  if (dDaysMatch) {
    const d = new Date(today);
    d.setDate(d.getDate() + parseInt(dDaysMatch[1]));
    return d.toISOString().slice(0, 10);
  }

  // MM/DD(요일) format
  const mmddMatch = t.match(/^(\d{2})\/(\d{2})/);
  if (mmddMatch) {
    const month = parseInt(mmddMatch[1]);
    const day = parseInt(mmddMatch[2]);
    const d = new Date(today.getFullYear(), month - 1, day);
    if (d < today) d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }

  // YYYYMMDD format
  const ymdMatch = t.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
  }

  return null;
}

function extractLocation(text: string): string | null {
  for (const region of REGION_PREFIXES) {
    const idx = text.indexOf(region);
    if (idx === -1) continue;
    const snippet = text
      .slice(idx, idx + 30)
      .replace(/\s*수도권.+$/, "")
      .replace(/\s+/g, " ")
      .trim();
    return snippet;
  }
  return null;
}

export async function POST() {
  try {
    const res = await fetch(CRAWL_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
        Referer: BASE_URL,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `미디어잡 요청 실패: HTTP ${res.status}` },
        { status: 502 }
      );
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const jobs: JobInsert[] = [];
    const seenRecIdx = new Set<string>();

    // div.list_content 안의 li = 개별 공고 / #list_06 범위로 VVIP·배너 자동 제외
    $("#list_06 > dl > dd > div.list_content li").each((_, el) => {
        const $el = $(el);
        const links = $el.find('a[href*="rec_idx"]');

        const firstHref = links.first().attr("href") ?? "";
        const recIdxMatch = firstHref.match(/rec_idx=(\d+)/);
        if (!recIdxMatch) return;

        const recIdx = recIdxMatch[1];
        if (seenRecIdx.has(recIdx)) return;
        seenRecIdx.add(recIdx);

        const sourceUrl = `${BASE_URL}/recruit/recruit.htm?cmd=view&rec_idx=${recIdx}`;

        // 링크 텍스트 중복 제거 (로고+텍스트 이중 링크 대응)
        const uniqueTexts: string[] = [];
        links.each((_, link) => {
          const text = $(link).text().trim();
          if (text && !uniqueTexts.includes(text)) uniqueTexts.push(text);
        });

        let company: string | null = null;
        let title = "";

        if (uniqueTexts.length >= 2) {
          company = uniqueTexts[0];
          title = uniqueTexts[1];
        } else if (uniqueTexts.length === 1) {
          title = uniqueTexts[0];
          // 회사명이 평문 텍스트인 경우: 링크 제거 후 첫 번째 텍스트 줄 추출
          const $clone = $el.clone();
          $clone.find("a").remove();
          const plainLines = $clone
            .text()
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && s !== "새글");
          company = plainLines[0] || null;
        }

        if (!title) return;

        const fullText = $el.text();
        const location = extractLocation(fullText);

        const deadlineMatch = fullText.match(
          /D-\d+(?:\s*\(~\d{2}\/\d{2}\))?|내일마감|채용시까지|상시채용|급구|\d{2}\/\d{2}(?:\([^)]+\))?/
        );
        const deadline = deadlineMatch ? parseDeadline(deadlineMatch[0]) : null;

        jobs.push({
          title,
          company,
          location,
          source: "mediajob",
          source_url: sourceUrl,
          status: "pending",
          deadline,
        });
      });

    if (jobs.length === 0) {
      return NextResponse.json(
        { error: "파싱 실패: 공고를 찾을 수 없습니다. 사이트 구조가 변경됐을 수 있습니다." },
        { status: 422 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("job_postings")
      .upsert(jobs, { onConflict: "source_url" })
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
