/**
 * 릴레이 스터디 음성 파일 보관 기간 정리.
 * 퀘스트 마감 후 8주가 지난 Storage 객체만 삭제하고 제출/피드백 기록은 남긴다.
 */

import { createAdminClient } from "@/lib/supabase/server";
import {
  STUDY_AUDIO_BUCKET,
  STUDY_AUDIO_RETENTION_WEEKS,
} from "./constants";
import type { Database } from "@/types/database.types";

type RelaySubmissionRow = Database["public"]["Tables"]["study_relay_submissions"]["Row"];
type StudyQuestRow = Database["public"]["Tables"]["study_quests"]["Row"];

export type PurgeOldStudyAudioResult = {
  success: boolean;
  scanned: number;
  deleted: number;
  marked: number;
  error?: string;
};

export async function purgeOldStudyAudio(): Promise<PurgeOldStudyAudioResult> {
  const supabase = createAdminClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - STUDY_AUDIO_RETENTION_WEEKS * 7);

  const { data: questRows, error: questError } = await supabase
    .from("study_quests")
    .select("id")
    .lt("due_at", cutoff.toISOString())
    .limit(100);

  if (questError) {
    return {
      success: false,
      scanned: 0,
      deleted: 0,
      marked: 0,
      error: questError.message,
    };
  }

  const questIds = ((questRows ?? []) as Pick<StudyQuestRow, "id">[]).map((quest) => quest.id);
  if (questIds.length === 0) {
    return { success: true, scanned: 0, deleted: 0, marked: 0 };
  }

  const { data, error } = await supabase
    .from("study_relay_submissions")
    .select("id, audio_path")
    .is("audio_deleted_at", null)
    .in("quest_id", questIds)
    .limit(100);

  if (error) {
    return {
      success: false,
      scanned: 0,
      deleted: 0,
      marked: 0,
      error: error.message,
    };
  }

  const rows = (data ?? []) as Pick<RelaySubmissionRow, "id" | "audio_path">[];
  if (rows.length === 0) {
    return { success: true, scanned: 0, deleted: 0, marked: 0 };
  }

  const { error: removeError } = await supabase.storage
    .from(STUDY_AUDIO_BUCKET)
    .remove(rows.map((row) => row.audio_path));

  if (removeError) {
    return {
      success: false,
      scanned: rows.length,
      deleted: 0,
      marked: 0,
      error: removeError.message,
    };
  }

  const { error: updateError } = await supabase
    .from("study_relay_submissions")
    .update({ audio_deleted_at: new Date().toISOString() })
    .in("id", rows.map((row) => row.id));

  if (updateError) {
    return {
      success: false,
      scanned: rows.length,
      deleted: rows.length,
      marked: 0,
      error: updateError.message,
    };
  }

  return {
    success: true,
    scanned: rows.length,
    deleted: rows.length,
    marked: rows.length,
  };
}
