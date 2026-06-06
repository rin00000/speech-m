/**
 * 게스트와 등업 대기 사용자를 위한 대시보드 서버 뷰.
 * 등업 요청 상태 조회와 멤버십 안내 화면을 함께 담당한다.
 */

import Link from "next/link";
import { LogoutButton } from "@/components/app/layout/logout-button";
import { Header } from "@/components/admin/layout/header";
import { createAdminClient } from "@/lib/supabase/server";
import { GuestUpgradeRequestCard } from "./guest-upgrade-request-card";

type GuestDashboardViewProps = {
  userName: string | null;
  email: string;
  isLoggedIn: boolean;
};

export async function GuestDashboardView({
  userName,
  email,
  isLoggedIn,
}: GuestDashboardViewProps) {
  let pendingUpgradeRequest: { message: string; requested_at: string } | null = null;

  if (isLoggedIn && email) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("student_upgrade_requests")
      .select("message,requested_at")
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    pendingUpgradeRequest = data ?? null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-br from-slate-50 to-periwinkle-50/20">
      <Header
        title="Speech-M 멤버십 센터"
        description="Speech-M의 특별한 회원 권한 상태를 확인하실 수 있는 라운지입니다."
      />

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4 md:p-6">
        <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm md:rounded-3xl md:p-10">
          <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-periwinkle-100/50 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 h-52 w-52 rounded-full bg-pink-100/30 blur-3xl" />

          <div className="relative z-10">
            <span className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 text-amber-500 shadow-sm">
              ✨
            </span>

            <h2 className="text-xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-2xl">
              {userName ?? "준비생"}님, 가입을 환영합니다!
            </h2>
            <p className="mt-3 inline-block rounded-full border border-amber-100/50 bg-amber-50/70 px-3.5 py-1 text-xs font-semibold text-amber-600 md:text-sm">
              ⚡ 현재 &apos;수강생 정회원 권한&apos; 신청 대기 상태입니다.
            </p>

            <p className="mx-auto mt-5 max-w-lg text-xs font-medium leading-relaxed text-gray-500 md:text-sm">
              현재 계정({email || "비로그인"})은 **일반 게스트(불특정 다수)** 역할입니다.
              아카데미 정회원 등록 절차가 끝나면 원장님이 즉시 **수강생(student)** 권한으로
              승격해 드리며, 수강생용 전용 혜택이 모두 활성화됩니다!
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 border-t border-gray-150 pt-8 text-left sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                <h4 className="flex items-center gap-1 text-xs font-bold text-gray-800">
                  <span>🎙️</span>
                  <span>최고급 방송 연습 원고실</span>
                </h4>
                <p className="mt-1 text-[11px] font-medium leading-normal text-gray-500">
                  실제 뉴스 속보, 기상캐스터, 라디오 오프닝, 증시 시황을 비롯한 고난도 딕션
                  훈련 대본에 제한 없이 접근합니다.
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                <h4 className="flex items-center gap-1 text-xs font-bold text-gray-800">
                  <span>🎯</span>
                  <span>1:1 릴레이 밀착 코칭</span>
                </h4>
                <p className="mt-1 text-[11px] font-medium leading-normal text-gray-500">
                  나의 음성과 발성에 대한 보완 과제를 밀착 지도해 주는 담임제 피드백을
                  실시간으로 확인하고 학습할 수 있습니다.
                </p>
              </div>
            </div>

            {isLoggedIn ? (
              <>
                <div className="mt-8 flex justify-center">
                  <Link
                    href="/jobs"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-gray-100 px-6 py-3.5 text-xs font-extrabold text-gray-600 transition-all hover:bg-gray-200 active:scale-[0.98] sm:w-auto"
                  >
                    <span>Curated 채용 공고 보러가기</span>
                    <span>→</span>
                  </Link>
                </div>
                <div className="mt-3 md:hidden">
                  <LogoutButton />
                </div>
                <GuestUpgradeRequestCard pendingRequest={pendingUpgradeRequest} />
              </>
            ) : (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-periwinkle-600 px-6 py-3.5 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-periwinkle-700 active:scale-[0.98] sm:w-auto"
                >
                  로그인하고 등업 문의 보내기
                </Link>
                <Link
                  href="/jobs"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-gray-100 px-6 py-3.5 text-xs font-bold text-gray-600 transition-all hover:bg-gray-200 sm:w-auto"
                >
                  Curated 채용 공고 보러가기
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
