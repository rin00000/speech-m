"use client";

/**
 * 릴레이 스터디 음성 파일 업로드 helper.
 * 서버 액션으로 signed upload URL을 발급받고 Supabase Storage에 실제 파일을 올린다.
 */

import { createClient } from "@/lib/supabase/client";
import { STUDY_AUDIO_BUCKET } from "@/lib/studies/constants";
import { createStudyAudioUploadTarget } from "../../actions";

export async function uploadAudio({
  questId,
  file,
}: {
  questId: string;
  file: File;
}) {
  const target = await createStudyAudioUploadTarget({
    questId,
    fileName: file.name,
    sizeBytes: file.size,
    contentType: file.type,
  });

  if (!target.success) return target;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(STUDY_AUDIO_BUCKET)
    .uploadToSignedUrl(target.data.path, target.data.token, file, {
      contentType: target.data.contentType,
    });

  if (error) return { success: false as const, error: "음성 파일 업로드에 실패했습니다." };

  return {
    success: true as const,
    data: {
      path: target.data.path,
      contentType: target.data.contentType,
    },
  };
}
