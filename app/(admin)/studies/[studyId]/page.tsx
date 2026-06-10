/**
 * /studies/[studyId] 릴레이 스터디 상세 페이지.
 * 접근 가능한 스터디 상세 데이터를 조회하고 제출·피드백 화면을 렌더링한다.
 */

import Link from "next/link";
import { Header } from "@/components/admin/layout/header";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, LockIcon } from "@hugeicons/core-free-icons";
import { getCurrentUser } from "@/lib/auth/session";
import { getStudyDetail } from "@/lib/studies/data";
import { RelayStudyDetailView } from "./_components/relay-study-detail-view";
import { StudyRealNameGate } from "./_components/study-real-name-gate";

export default async function RelayStudyPage({
  params,
}: {
  params: Promise<{ studyId: string }>;
}) {
  const [{ studyId }, user] = await Promise.all([params, getCurrentUser()]);
  const role = user?.role ?? "guest";
  const userId = user?.userId ?? null;
  const detail = await getStudyDetail({ studyId, viewer: { role, userId } });
  const needsRealName = Boolean(
    detail && role === "student" && !user?.realName?.trim(),
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title={detail?.group.title ?? "릴레이 스터디"}
        description="원고별 음성 제출과 학생 간 피드백을 릴레이로 이어갑니다."
      />

      {detail && needsRealName ? (
        <StudyRealNameGate
          studyId={studyId}
          studyTitle={detail.group.title}
          displayName={user?.name ?? null}
        />
      ) : detail ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          <RelayStudyDetailView detail={detail} currentUserId={userId} role={role} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-gray-50/50 p-4 md:p-6">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm md:rounded-3xl md:p-8">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-periwinkle-50 text-periwinkle-600">
              <HugeiconsIcon icon={LockIcon} size={28} color="currentColor" />
            </span>
            <h2 className="mt-5 text-xl font-extrabold tracking-tight text-gray-900">
              스터디를 열 수 없습니다
            </h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-gray-500">
              스터디 멤버이거나 관리자 계정일 때만 상세 화면에 접근할 수 있습니다.
            </p>
            <Link
              href="/studies"
              className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-periwinkle-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-periwinkle-700"
            >
              스터디 목록
              <HugeiconsIcon icon={ArrowRight01Icon} size={15} color="currentColor" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
