/**
 * 정회원 수강생 전용 대시보드 화면.
 * 학습 훈련과 릴레이 피드백 진입 카드를 독립된 뷰로 유지한다.
 */

import Link from "next/link";
import { Header } from "@/components/admin/layout/header";

export function StudentDashboardView({ userName }: { userName: string | null }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title="나의 학습 대시보드"
        description="Speech-M 명품 스피치 클래스에 오신 것을 환영합니다."
      />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 md:space-y-6 md:p-6">
        <div className="relative overflow-hidden rounded-2xl bg-periwinkle-600 p-4 text-white shadow-sm md:rounded-3xl md:p-8">
          <div className="absolute -right-16 -top-16 h-48 w-48 animate-pulse rounded-full bg-white/10 blur-2xl" />
          <div className="relative z-10 space-y-2">
            <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">
              🎙️ 안녕하세요, {userName ?? "준비생"} 수강생님!
            </h2>
            <p className="max-w-xl text-xs font-medium leading-relaxed text-periwinkle-100 md:text-sm">
              오늘도 마이크 앞에서 당신의 온전한 스피치 빛깔을 빛내어 보세요. 정성스럽게
              선별된 훈련용 원고와 아카데미 강사진이 밀착 피드백을 전달할 준비를 마쳤습니다.
            </p>
            <div className="mt-4 pt-2">
              <Link
                href="/practice"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-periwinkle-700 transition-transform hover:bg-periwinkle-50 active:scale-95"
              >
                <span>오늘의 연습 원고 매치하기</span>
                <span className="text-lg">→</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:rounded-3xl md:p-6">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-gray-800">
                <span className="text-lg">📖</span>
                <span>정회원 추천 학습 훈련</span>
              </h3>
              <p className="mt-1 text-xs font-medium text-gray-400">
                원장님이 엄선한 핵심 딕션 및 시황 리포트 훈련 코스입니다.
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <span className="text-xs font-bold text-gray-700">
                    KBS 정오 뉴스 - 수도권 집중호우
                  </span>
                  <span className="rounded bg-periwinkle-50 px-2 py-0.5 text-[10px] font-extrabold text-periwinkle-600">
                    난이도 보통
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <span className="text-xs font-bold text-gray-700">
                    YTN 경제 브리핑 - 미 금리 인하
                  </span>
                  <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-extrabold text-red-500">
                    난이도 어려움
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-bold text-gray-700">
                    MBC 기상정보 - 때 이른 초여름
                  </span>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600">
                    난이도 쉬움
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/practice"
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gray-50 py-2.5 text-xs font-extrabold text-gray-600 hover:bg-gray-100"
            >
              연습 원고실로 입장
            </Link>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:rounded-3xl md:p-6">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-gray-800">
                <span className="text-lg">💬</span>
                <span>나의 1:1 릴레이 피드백</span>
              </h3>
              <p className="mt-1 text-xs font-medium text-gray-400">
                강사진이 분석한 나의 강점과 극복 과제가 도착하는 알림장입니다.
              </p>

              <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-150 bg-gray-50/50 py-4 text-center">
                <span className="text-xl">✨</span>
                <p className="mt-2 text-xs font-bold text-gray-600">
                  피드백이 안전하게 준비 중입니다
                </p>
                <p className="mt-0.5 text-[10px] text-gray-400">
                  스터디 녹음본을 제출하시면 강사진의 코칭이 이곳에 도착합니다.
                </p>
              </div>
            </div>

            <Link
              href="/studies"
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gray-50 py-2.5 text-xs font-extrabold text-gray-600 hover:bg-gray-100"
            >
              내 스터디 현황 확인
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
