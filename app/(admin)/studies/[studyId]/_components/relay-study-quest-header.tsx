/**
 * 활성 릴레이 퀘스트의 원고, 마감, 제출 현황 지표를 표시한다.
 * 상세 화면 상단에서 퀘스트 맥락을 빠르게 확인하게 하는 요약 카드다.
 */

import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { Card, CardBody } from "@/components/ui/card";
import type { StudyQuestDetail } from "@/lib/studies/data";
import { formatDateTime, getStatusLabel, Metric } from "./relay-study-detail-common";

export function QuestHeader({ quest }: { quest: StudyQuestDetail }) {
  const isExpiredOpenQuest = quest.status === "open" && quest.isOverdue;

  return (
    <Card>
      <CardBody className="space-y-4 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold leading-none ${
                  isExpiredOpenQuest
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-periwinkle-200 bg-periwinkle-50 text-periwinkle-700"
                }`}
              >
                {isExpiredOpenQuest ? "마감 지남" : getStatusLabel(quest.relay.status)}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-bold ${
                  isExpiredOpenQuest ? "text-red-600" : "text-gray-400"
                }`}
              >
                <HugeiconsIcon icon={Calendar01Icon} size={13} color="currentColor" />
                {formatDateTime(quest.dueAt)}
                {isExpiredOpenQuest ? " 마감" : ""}
              </span>
            </div>
            <h3 className="mt-3 text-lg font-extrabold leading-tight text-gray-900 md:text-xl">
              {quest.scriptTitle}
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center md:w-52 md:shrink-0">
            <Metric label="완료" value={`${quest.relay.completedSubmissions.length}`} />
            <Metric label="제출" value={`${quest.relay.submissions.length}`} />
            <Metric label="미참여" value={`${quest.relay.unsubmittedMembers.length}`} />
          </div>
        </div>
        <pre className="max-h-[60vh] min-h-[320px] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-gray-100 bg-gray-50 p-5 font-sans text-lg font-semibold leading-8 text-gray-800 md:min-h-[420px] md:p-6 md:text-xl md:leading-9">
          {quest.scriptContent}
        </pre>
      </CardBody>
    </Card>
  );
}
