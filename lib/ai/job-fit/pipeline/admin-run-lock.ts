/**
 * 관리자 job-fit 배치의 중복 실행을 막는 DB 기반 TTL 락.
 * 기존 system_settings 테이블의 단일 키를 사용해 서버리스 인스턴스 간 실행을 조율한다.
 */

import { createAdminClient } from "@/lib/supabase/server";
import type { DbJson } from "@/types/database.types";
import { JOB_FIT_ADMIN_RUN_LOCK_TTL_MS } from "../constants";

type LockRow = {
  key: string;
};

type AcquiredAdminRunLock = {
  acquired: true;
  owner: string;
  release: () => Promise<void>;
};

type BusyAdminRunLock = {
  acquired: false;
  owner: string;
  release: () => Promise<void>;
};

export type AdminJobFitRunLock = AcquiredAdminRunLock | BusyAdminRunLock;

const ADMIN_JOB_FIT_RUN_LOCK_KEY = "job_fit_admin_run_lock";

const createLockValue = (owner: string, nowMs: number): DbJson => ({
  owner,
  acquired_at: new Date(nowMs).toISOString(),
  expires_at: new Date(nowMs + JOB_FIT_ADMIN_RUN_LOCK_TTL_MS).toISOString(),
});

const createOwner = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export const acquireAdminJobFitRunLock = async (): Promise<AdminJobFitRunLock> => {
  const supabase = createAdminClient();
  const nowMs = Date.now();
  const owner = createOwner();
  const value = createLockValue(owner, nowMs);
  const updatedAt = new Date(nowMs).toISOString();

  const release = async () => {
    const { error } = await supabase
      .from("system_settings")
      .delete()
      .eq("key", ADMIN_JOB_FIT_RUN_LOCK_KEY)
      .eq("value->>owner", owner);

    if (error) {
      console.error("[admin/job-fit/run] lock release failed", {
        error: error.message,
      });
    }
  };

  const { error: insertError } = await supabase.from("system_settings").insert({
    key: ADMIN_JOB_FIT_RUN_LOCK_KEY,
    value,
    updated_at: updatedAt,
  });

  if (!insertError) {
    return { acquired: true, owner, release };
  }

  if (insertError.code !== "23505") {
    throw new Error(`Failed to acquire job-fit run lock: ${insertError.message}`);
  }

  const { data: updatedRows, error: updateError } = await supabase
    .from("system_settings")
    .update({ value, updated_at: updatedAt })
    .eq("key", ADMIN_JOB_FIT_RUN_LOCK_KEY)
    .lt("value->>expires_at", updatedAt)
    .select("key")
    .returns<LockRow[]>();

  if (updateError) {
    throw new Error(`Failed to refresh expired job-fit run lock: ${updateError.message}`);
  }

  if ((updatedRows ?? []).length === 0) {
    return { acquired: false, owner, release: async () => {} };
  }

  return { acquired: true, owner, release };
};
