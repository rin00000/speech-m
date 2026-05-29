/**
 * 릴레이 스터디의 Storage, 파일 제한, 보관 정책 상수.
 * Server Actions와 클라이언트 업로드 UI가 같은 기준을 쓰도록 분리한다.
 */

export const STUDY_AUDIO_BUCKET = "study-audio";

export const STUDY_AUDIO_MAX_SIZE_BYTES = 20 * 1024 * 1024;

export const STUDY_AUDIO_RETENTION_WEEKS = 8;

export const STUDY_AUDIO_SIGNED_URL_TTL_SECONDS = 60 * 60;

export const STUDY_AUDIO_ALLOWED_EXTENSIONS = ["mp3", "m4a", "wav"] as const;

export const STUDY_AUDIO_ALLOWED_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
] as const;

export type StudyAudioExtension = (typeof STUDY_AUDIO_ALLOWED_EXTENSIONS)[number];
export type StudyAudioMimeType = (typeof STUDY_AUDIO_ALLOWED_MIME_TYPES)[number];
