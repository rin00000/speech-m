import { getCurrentUser } from "@/lib/auth/session";
import { Header } from "@/components/admin/layout/header";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  ArrowRight01Icon,
  LockIcon,
} from "@hugeicons/core-free-icons";
import Link from "next/link";
import { PracticeListView } from "./practice-list-view";
import { createAdminClient } from "@/lib/supabase/server";

export interface ScriptItem {
  id: string;
  title: string;
  category: "practice" | "portfolio";
  type: string;
  difficulty: "쉬움" | "보통" | "어려움";
  length: number;
  description: string;
  content: string;
}

export default async function PracticePage() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";
  const isAuthorized = user && (user.role === "admin" || user.role === "student");

  let scripts: ScriptItem[] = [];

  if (isAuthorized) {
    const supabase = createAdminClient();

    const { data } = await supabase
      .from("practice_scripts")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      scripts = data as ScriptItem[];
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="수강생 명품 원고 연습실"
        description="최정상 아나운서 및 미디어 선배들의 안목으로 정제된 핵심 훈련 및 포트폴리오용 대본입니다."
      />

      {isAuthorized ? (
        <div className="flex-1 p-6">
          <PracticeListView scripts={scripts} isAdmin={isAdmin} />
        </div>
      ) : (
        <div className="flex-1 p-6 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-periwinkle-50/20">
          <div className="max-w-md w-full rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-lg relative overflow-hidden">
            <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-periwinkle-100/50 blur-2xl" />
            
            <span className="relative z-10 inline-flex h-16 w-16 items-center justify-center rounded-full bg-periwinkle-50 text-periwinkle-600 mb-6 shadow-sm">
              <HugeiconsIcon icon={LockIcon} size={28} color="currentColor" strokeWidth={1.8} />
            </span>

            <h2 className="relative z-10 text-xl font-extrabold text-gray-900 tracking-tight">
              정회원 수강생 전용 공간입니다
            </h2>
            <p className="mt-3 text-sm font-medium text-gray-500 leading-relaxed">
              본 화면은 Speech-M 아카데미에 등록하고 원장님께 **&apos;수강생(student)&apos;** 권한을 부여받은 정회원분들만 접근할 수 있는 프리미엄 공간입니다.
            </p>

            <div className="mt-8 space-y-3.5 text-left border-t border-gray-100 pt-6">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">정회원 수강생 혜택</h4>
              <div className="flex items-start gap-2.5 text-xs text-gray-700">
                <span className="text-emerald-500 shrink-0">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} color="currentColor" />
                </span>
                <span className="font-semibold">엄선된 고품질 방송 연습 원고 무제한 이용</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-gray-700">
                <span className="text-emerald-500 shrink-0">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} color="currentColor" />
                </span>
                <span className="font-semibold">실제 방송 시험 대비 최고급 포트폴리오 대본 제공</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-gray-700">
                <span className="text-emerald-500 shrink-0">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} color="currentColor" />
                </span>
                <span className="font-semibold">현직 강사진의 1:1 디테일 릴레이 피드백 수령</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              {user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-periwinkle-600 px-4 py-3 text-sm font-extrabold text-white shadow-md transition-all active:scale-[0.98] hover:bg-periwinkle-700 hover:shadow-lg"
                >
                  <span>수강생 등업 신청 대기실로 이동</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="currentColor" />
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-periwinkle-600 px-4 py-3 text-sm font-extrabold text-white shadow-md transition-all active:scale-[0.98] hover:bg-periwinkle-700 hover:shadow-lg"
                >
                  <span>1초 로그인 후 수강생 권한 문의</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} color="currentColor" />
                </Link>
              )}
              <Link
                href="/jobs"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-gray-100 px-4 py-2.5 text-xs font-bold text-gray-600 transition-all hover:bg-gray-200"
              >
                공개 채용 공고 열람실로 가기
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
