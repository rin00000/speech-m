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
  return (
    <Card>
      <CardBody className="grid gap-4 py-4 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-periwinkle-200 bg-periwinkle-50 px-2.5 py-1 text-[11px] font-extrabold leading-none text-periwinkle-700">
              {getStatusLabel(quest.relay.status)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-400">
              <HugeiconsIcon icon={Calendar01Icon} size={13} color="currentColor" />
              {formatDateTime(quest.dueAt)}
            </span>
          </div>
          <h3 className="mt-3 text-base font-extrabold leading-tight text-gray-900">
            {quest.scriptTitle}
          </h3>
          <pre className="mt-3 max-h-36 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-gray-100 bg-gray-50 p-3 font-sans text-sm font-medium leading-relaxed text-gray-700">
            {quest.scriptContent}
          </pre>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center md:min-w-52">
          <Metric label="완료" value={`${quest.relay.completedSubmissions.length}`} />
          <Metric label="제출" value={`${quest.relay.submissions.length}`} />
          <Metric label="미참여" value={`${quest.relay.unsubmittedMembers.length}`} />
        </div>
      </CardBody>
    </Card>
  );
}
