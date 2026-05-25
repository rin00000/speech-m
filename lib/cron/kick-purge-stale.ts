import { after } from "next/server";

/**
 * 일일 크롤(`/api/crawl/all`) 종료 후 purge-stale을 별도 invocation으로 kick한다.
 * Vercel Hobby 플랜 2-cron 한도로 인해 cron 등록 대신 after() kick으로 처리.
 */
export function schedulePurgeStaleCronKick(origin: string): void {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    console.warn("[cron/kick-purge-stale] skip: CRON_SECRET not set");
    return;
  }

  const base = origin.replace(/\/$/, "");
  const url = `${base}/api/cron/purge-stale-job-postings`;

  after(async () => {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${cronSecret}`,
    };
    const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
    if (protectionBypass) {
      headers["x-vercel-protection-bypass"] = protectionBypass;
    }

    const startedAt = Date.now();
    try {
      const response = await fetch(url, { method: "GET", headers, cache: "no-store" });
      const text = await response.text();
      if (!response.ok) {
        console.error("[cron/kick-purge-stale] failed", {
          status: response.status,
          durationMs: Date.now() - startedAt,
          body: text.slice(0, 500),
        });
        return;
      }
      console.info("[cron/kick-purge-stale] ok", {
        status: response.status,
        durationMs: Date.now() - startedAt,
        body: text.slice(0, 500),
      });
    } catch (error) {
      console.error("[cron/kick-purge-stale] error", {
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
