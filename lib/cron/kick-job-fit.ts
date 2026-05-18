import { after } from "next/server";

/**
 * 일일 크롤(`/api/crawl/all`) 종료 후 job-fit Cron을 별도 invocation으로 kick한다.
 * 본 요청에서는 await 하지 않는다(LLM 시간은 `/api/cron/job-fit`의 maxDuration에만 소모).
 */
export function scheduleJobFitCronKick(origin: string): void {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    console.warn("[cron/kick-job-fit] skip: CRON_SECRET not set");
    return;
  }

  const base = origin.replace(/\/$/, "");
  const url = `${base}/api/cron/job-fit`;

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
        console.error("[cron/kick-job-fit] failed", {
          status: response.status,
          durationMs: Date.now() - startedAt,
          body: text.slice(0, 500),
        });
        return;
      }
      console.info("[cron/kick-job-fit] ok", {
        status: response.status,
        durationMs: Date.now() - startedAt,
        body: text.slice(0, 500),
      });
    } catch (error) {
      console.error("[cron/kick-job-fit] error", {
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
