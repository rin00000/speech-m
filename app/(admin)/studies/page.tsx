import Link from "next/link";
import { Header } from "@/components/admin/layout/header";
import { HugeiconsIcon } from "@hugeicons/react";
import { LockIcon } from "@hugeicons/core-free-icons";
import { getCurrentUser } from "@/lib/auth/session";
import { getStudentProfiles, getStudiesForViewer } from "@/lib/studies/data";
import { StudiesIndexView } from "./studies-index-view";

export default async function StudiesPage() {
  const user = await getCurrentUser();
  const role = user?.role ?? "guest";
  const email = user?.email ?? null;
  const isAuthorized = role === "admin" || role === "student";

  const [studies, studentProfiles] = isAuthorized
    ? await Promise.all([
        getStudiesForViewer({ role, email }),
        role === "admin" ? getStudentProfiles() : Promise.resolve([]),
      ])
    : [[], []];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Header
        title={role === "admin" ? "스터디 관리" : "내 스터디"}
        description={
          role === "admin"
            ? "릴레이 스터디 그룹, 멤버, 주간 원고 퀘스트를 관리합니다."
            : "참여 중인 스터디와 이번 주 릴레이 퀘스트를 확인합니다."
        }
      />

      {isAuthorized ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          <StudiesIndexView role={role} studies={studies} studentProfiles={studentProfiles} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-gray-50/50 p-4 md:p-6">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm md:rounded-3xl md:p-8">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-periwinkle-50 text-periwinkle-600">
              <HugeiconsIcon icon={LockIcon} size={28} color="currentColor" />
            </span>
            <h2 className="mt-5 text-xl font-extrabold tracking-tight text-gray-900">
              정회원 수강생 전용 공간입니다
            </h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-gray-500">
              로그인 후 수강생 권한을 받으면 참여 중인 스터디가 표시됩니다.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-periwinkle-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-periwinkle-700"
            >
              로그인
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
