/**
 * 릴레이 스터디 상세 화면의 작은 공통 표시 컴포넌트와 날짜/상태 포맷터.
 * 여러 카드에서 반복되는 빈 상태와 지표 UI를 한곳에서 재사용한다.
 */

import type { StudyQuestDetail } from "@/lib/studies/data";

export function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm font-bold text-gray-400">
      {text}
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-2 py-2">
      <p className="text-base font-extrabold leading-none text-gray-900">{value}</p>
      <p className="mt-1 text-[10px] font-bold leading-none text-gray-400">{label}</p>
    </div>
  );
}

export function getStatusLabel(status: StudyQuestDetail["relay"]["status"]) {
  if (status === "not_started") return "시작 전";
  if (status === "waiting_feedback") return "피드백 대기";
  if (status === "waiting_final_feedback") return "마지막 피드백";
  return "완료";
}

export function formatDateTime(value: string) {
  const baseDate = new Date(value);

  if (Number.isNaN(baseDate.getTime())) {
    return value;
  }

  const seoulDate = new Date(baseDate.getTime() + 9 * 60 * 60 * 1000);
  const month = seoulDate.getUTCMonth() + 1;
  const day = seoulDate.getUTCDate();
  const hour24 = seoulDate.getUTCHours();
  const hour12 = hour24 % 12 || 12;
  const period = hour24 < 12 ? "오전" : "오후";
  const minute = seoulDate.getUTCMinutes().toString().padStart(2, "0");

  return `${month}월 ${day}일 ${period} ${hour12.toString().padStart(2, "0")}:${minute}`;
}
