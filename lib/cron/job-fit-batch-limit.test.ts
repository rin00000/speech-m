import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_JOB_FIT_CRON_BATCH_LIMIT,
  getJobFitCronBatchLimit,
  MAX_JOB_FIT_CRON_BATCH_LIMIT,
} from "./job-fit-batch-limit";

describe("getJobFitCronBatchLimit", () => {
  const prev = process.env.JOB_FIT_BATCH_LIMIT;

  afterEach(() => {
    if (prev === undefined) delete process.env.JOB_FIT_BATCH_LIMIT;
    else process.env.JOB_FIT_BATCH_LIMIT = prev;
  });

  it("returns default when unset", () => {
    delete process.env.JOB_FIT_BATCH_LIMIT;
    expect(getJobFitCronBatchLimit()).toBe(DEFAULT_JOB_FIT_CRON_BATCH_LIMIT);
  });

  it("clamps to max", () => {
    process.env.JOB_FIT_BATCH_LIMIT = "99";
    expect(getJobFitCronBatchLimit()).toBe(MAX_JOB_FIT_CRON_BATCH_LIMIT);
  });

  it("parses valid limit", () => {
    process.env.JOB_FIT_BATCH_LIMIT = "8";
    expect(getJobFitCronBatchLimit()).toBe(8);
  });
});
