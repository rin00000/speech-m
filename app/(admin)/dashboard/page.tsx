import { Header } from "@/components/admin/header";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Briefcase01Icon,
  FileEditIcon,
  BookOpen01Icon,
  ChartLineData02Icon,
} from "@hugeicons/core-free-icons";

const STAT_CARDS = [
  {
    label: "등록된 공고",
    value: "—",
    sub: "전체 공고 수",
    icon: Briefcase01Icon,
    color: "text-indigo-500",
    bg: "bg-indigo-50",
  },
  {
    label: "시험 후기",
    value: "—",
    sub: "누적 후기 수",
    icon: FileEditIcon,
    color: "text-violet-500",
    bg: "bg-violet-50",
  },
  {
    label: "스터디 그룹",
    value: "—",
    sub: "운영 중인 스터디",
    icon: BookOpen01Icon,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
  },
  {
    label: "이번 달 활동",
    value: "—",
    sub: "총 업데이트 건수",
    icon: ChartLineData02Icon,
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col">
      <Header
        title="대시보드"
        description="Speech-M 아카데미 현황을 한눈에 확인하세요."
      />

      <div className="flex-1 p-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STAT_CARDS.map((card) => (
            <div
              key={card.label}
              className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  {card.label}
                </p>
                <span className={`rounded-lg p-2 ${card.bg} ${card.color}`}>
                  <HugeiconsIcon
                    icon={card.icon}
                    size={18}
                    color="currentColor"
                    strokeWidth={1.5}
                  />
                </span>
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight text-slate-800">
                  {card.value}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{card.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity Placeholder */}
        <div className="mt-6 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              최근 활동
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
              준비 중
            </span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-12 text-center">
            <p className="text-sm text-slate-400">
              데이터를 연결하면 최근 활동이 표시됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
