export type CrawlSource = "mediajob" | "saramin" | "jobkorea";

export type CrawlRunResult = {
  source: CrawlSource;
  success: boolean;
  saved?: number;
  total?: number;
  error?: string;
  durationMs: number;
};

export const CRAWL_SOURCES: readonly CrawlSource[] = [
  "mediajob",
  "saramin",
  "jobkorea",
] as const;

type TriggerOptions = {
  baseUrl: string;
  secret: string;
};

const readJson = async (
  response: Response
): Promise<{ saved?: number; total?: number; error?: string }> => {
  try {
    return (await response.json()) as {
      saved?: number;
      total?: number;
      error?: string;
    };
  } catch {
    return {};
  }
};

export const triggerCrawl = async (
  source: CrawlSource,
  options: TriggerOptions
): Promise<CrawlRunResult> => {
  const startedAt = Date.now();

  try {
    const headers: Record<string, string> = {
      "x-crawl-secret": options.secret,
    };
    const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
    if (protectionBypass) {
      headers["x-vercel-protection-bypass"] = protectionBypass;
    }

    const response = await fetch(`${options.baseUrl}/api/crawl/${source}`, {
      method: "POST",
      headers,
      cache: "no-store",
    });

    const json = await readJson(response);
    if (!response.ok || json.error) {
      return {
        source,
        success: false,
        error: json.error ?? `HTTP ${response.status}`,
        durationMs: Date.now() - startedAt,
      };
    }

    return {
      source,
      success: true,
      saved: json.saved ?? 0,
      total: json.total ?? 0,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      source,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    };
  }
};
