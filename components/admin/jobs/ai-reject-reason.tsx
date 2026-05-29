/**
 * AI job-fit 스냅샷의 사유를 테이블 셀과 모바일 카드 블록 형태로 렌더링한다.
 * 스냅샷이 없을 때 상태별 대체 문구도 이 파일에서 통일한다.
 */

import { parseAiFitSnapshot } from "@/lib/ai/job-fit/domain/ai-fit-snapshot";
import type { JobPosting } from "./jobs-table-types";

export const AiRejectReasonCell = ({
  job,
  cellPaddingClass,
}: {
  job: JobPosting;
  cellPaddingClass: string;
}) => {
  const snap = parseAiFitSnapshot(job.ai_fit_snapshot);
  if (!snap) {
    if (job.status === "pending") {
      return (
        <td className={`${cellPaddingClass} max-w-56 text-xs text-gray-400`}>
          AI 미실행
        </td>
      );
    }
    return (
      <td className={`${cellPaddingClass} max-w-56 text-xs text-gray-400`}>
        AI 기록 없음
      </td>
    );
  }
  return (
    <td className={`${cellPaddingClass} max-w-72 align-top text-xs text-gray-600`}>
      <ul className="list-inside list-disc space-y-0.5 leading-snug">
        {snap.reasons.map((reason, index) => (
          <li key={index}>{reason}</li>
        ))}
      </ul>
      <p className="mt-1.5 tabular-nums text-[11px] text-gray-400">
        {snap.score}점 · {snap.model}
      </p>
    </td>
  );
};

export const AiRejectReasonBlock = ({ job }: { job: JobPosting }) => {
  const snap = parseAiFitSnapshot(job.ai_fit_snapshot);

  if (!snap) {
    return (
      <p className="text-xs font-medium leading-snug text-gray-400">
        {job.status === "pending" ? "AI 미실행" : "AI 기록 없음"}
      </p>
    );
  }

  return (
    <div className="space-y-1 text-xs leading-snug text-gray-600">
      <ul className="list-inside list-disc space-y-0.5">
        {snap.reasons.slice(0, 2).map((reason, index) => (
          <li key={index}>{reason}</li>
        ))}
      </ul>
      <p className="tabular-nums text-[11px] text-gray-400">
        {snap.score}점 · {snap.model}
      </p>
    </div>
  );
};
