"use client";

/**
 * /studies 진입 화면.
 * 관리자는 릴레이 스터디 그룹/멤버/퀘스트를 관리하고, 수강생은 가입된 스터디 목록을 연다.
 */

import { useMemo, useState, useTransition } from "react";
import type { InputHTMLAttributes } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowRight01Icon,
  BookOpen01Icon,
  Calendar01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import type { StudyAdminProfile, StudyListItem } from "@/lib/studies/data";
import type { UserRole } from "@/lib/auth/session";
import {
  createStudyGroup,
  createStudyQuest,
  saveStudyGroupMembers,
  updateStudyGroup,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

type StudiesIndexViewProps = {
  role: UserRole;
  studies: StudyListItem[];
  studentProfiles: StudyAdminProfile[];
};

export function StudiesIndexView({
  role,
  studies,
  studentProfiles,
}: StudiesIndexViewProps) {
  if (role === "admin") {
    return <AdminStudiesView studies={studies} studentProfiles={studentProfiles} />;
  }

  return <StudentStudiesView studies={studies} />;
}

function StudentStudiesView({ studies }: { studies: StudyListItem[] }) {
  if (studies.length === 0) {
    return (
      <EmptyState
        title="참여 중인 스터디가 없습니다"
        description="관리자가 스터디 멤버로 추가하면 이곳에 표시됩니다."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {studies.map((study) => (
        <Link
          key={study.id}
          href={`/studies/${study.id}`}
          className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-periwinkle-200 hover:bg-periwinkle-50/30 md:rounded-3xl md:p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-periwinkle-100 bg-periwinkle-50 text-periwinkle-700">
              <HugeiconsIcon icon={UserGroupIcon} size={18} color="currentColor" />
            </span>
            <span className="inline-flex items-center rounded-full border border-periwinkle-200 bg-periwinkle-50 px-2.5 py-1 text-[11px] font-bold leading-none text-periwinkle-700">
              릴레이
            </span>
          </div>

          <h2 className="mt-4 text-base font-extrabold leading-tight text-gray-900">
            {study.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug text-gray-500">
            {study.description || "이번 주 원고를 읽고 학생끼리 피드백을 이어갑니다."}
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <Metric label="멤버" value={`${study.memberCount}`} />
            <Metric label="진행" value={`${study.openQuestCount}`} />
            <Metric label="전체" value={`${study.questCount}`} />
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-xs font-bold text-gray-500">
            <span>{study.nextDueAt ? `${formatDate(study.nextDueAt)} 마감` : "열린 퀘스트 없음"}</span>
            <span className="inline-flex items-center gap-1 text-periwinkle-700">
              입장
              <HugeiconsIcon icon={ArrowRight01Icon} size={14} color="currentColor" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function AdminStudiesView({
  studies,
  studentProfiles,
}: {
  studies: StudyListItem[];
  studentProfiles: StudyAdminProfile[];
}) {
  const router = useRouter();
  const [selectedStudyId, setSelectedStudyId] = useState(studies[0]?.id ?? "");
  const selectedStudy = useMemo(
    () => studies.find((study) => study.id === selectedStudyId) ?? studies[0] ?? null,
    [selectedStudyId, studies],
  );
  const [selectedEmailsByStudyId, setSelectedEmailsByStudyId] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(studies.map((study) => [study.id, study.memberEmails])),
  );
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedEmails =
    selectedStudy
      ? selectedEmailsByStudyId[selectedStudy.id] ?? selectedStudy.memberEmails
      : [];
  const setSelectedEmails = (updater: (prev: string[]) => string[]) => {
    if (!selectedStudy) return;
    setSelectedEmailsByStudyId((prev) => ({
      ...prev,
      [selectedStudy.id]: updater(prev[selectedStudy.id] ?? selectedStudy.memberEmails),
    }));
  };

  const run = (fn: () => Promise<{ success: boolean; error?: string }>, successText: string) => {
    setNotice(null);
    startTransition(async () => {
      const result = await fn();
      if (result.success) {
        setNotice({ tone: "success", text: successText });
        router.refresh();
        return;
      }
      setNotice({ tone: "error", text: result.error ?? "작업을 완료하지 못했습니다." });
    });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="space-y-4">
        {notice && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
              notice.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {notice.text}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HugeiconsIcon icon={Add01Icon} size={18} color="currentColor" />
              새 스터디
            </CardTitle>
          </CardHeader>
          <CardBody>
            <form
              action={(formData) =>
                run(async () => createStudyGroup(formData), "스터디 그룹을 만들었습니다.")
              }
              className="space-y-3"
            >
              <TextInput name="title" placeholder="릴레이 스터디" required />
              <TextInput
                name="description"
                placeholder="학생끼리 음성 피드백을 이어가는 스터디"
              />
              <Button type="submit" disabled={isPending} className="w-full">
                스터디 만들기
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="space-y-2">
          {studies.length === 0 ? (
            <EmptyState
              title="운영 중인 스터디가 없습니다"
              description="새 스터디를 만들면 이곳에서 관리할 수 있습니다."
            />
          ) : (
            studies.map((study) => (
              <button
                key={study.id}
                type="button"
                onClick={() => setSelectedStudyId(study.id)}
                className={`w-full rounded-2xl border p-4 text-left shadow-sm transition-colors md:rounded-3xl ${
                  selectedStudy?.id === study.id
                    ? "border-periwinkle-200 bg-periwinkle-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-extrabold text-gray-900">
                      {study.title}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-gray-500">
                      멤버 {study.memberCount}명 · 열린 퀘스트 {study.openQuestCount}개
                    </p>
                  </div>
                  <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold leading-none text-gray-500">
                    {study.status === "active" ? "운영" : "보관"}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {selectedStudy && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <CardTitle className="text-base">{selectedStudy.title}</CardTitle>
                <Link
                  href={`/studies/${selectedStudy.id}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  상세 보기
                  <HugeiconsIcon icon={ArrowRight01Icon} size={13} color="currentColor" />
                </Link>
              </div>
            </CardHeader>
            <CardBody>
              <form
                key={selectedStudy.id}
                action={(formData) =>
                  run(
                    async () => updateStudyGroup(selectedStudy.id, formData),
                    "스터디 정보를 저장했습니다.",
                  )
                }
                className="grid gap-3 md:grid-cols-[1fr_140px_auto]"
              >
                <TextInput name="title" defaultValue={selectedStudy.title} required />
                <select
                  name="status"
                  defaultValue={selectedStudy.status}
                  className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
                >
                  <option value="active">운영</option>
                  <option value="archived">보관</option>
                </select>
                <input type="hidden" name="description" value={selectedStudy.description} />
                <Button type="submit" disabled={isPending} variant="ghost">
                  저장
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HugeiconsIcon icon={UserGroupIcon} size={18} color="currentColor" />
                멤버
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {studentProfiles.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-gray-200 py-8 text-center text-sm font-semibold text-gray-400 sm:col-span-2">
                    정회원 수강생이 없습니다.
                  </p>
                ) : (
                  studentProfiles.map((student) => {
                    const checked = selectedEmails.includes(student.email);
                    return (
                      <label
                        key={student.email}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 ${
                          checked
                            ? "border-periwinkle-200 bg-periwinkle-50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            setSelectedEmails((prev) =>
                              event.target.checked
                                ? [...prev, student.email]
                                : prev.filter((email) => email !== student.email),
                            );
                          }}
                          className="h-4 w-4 accent-periwinkle-600"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-extrabold text-gray-800">
                            {student.displayName}
                          </span>
                          <span className="block truncate text-[11px] font-medium text-gray-400">
                            {student.email}
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <Button
                type="button"
                disabled={isPending}
                onClick={() =>
                  run(
                    async () => saveStudyGroupMembers(selectedStudy.id, selectedEmails),
                    "스터디 멤버를 저장했습니다.",
                  )
                }
                className="w-full"
              >
                멤버 저장
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HugeiconsIcon icon={Calendar01Icon} size={18} color="currentColor" />
                새 퀘스트
              </CardTitle>
            </CardHeader>
            <CardBody>
              <form
                action={(formData) =>
                  run(
                    async () => createStudyQuest(selectedStudy.id, formData),
                    "릴레이 퀘스트를 만들었습니다.",
                  )
                }
                className="space-y-3"
              >
                <TextInput name="scriptTitle" placeholder="이번주 뉴스 원고" required />
                <textarea
                  name="scriptContent"
                  required
                  rows={7}
                  placeholder="원고 내용을 입력하세요."
                  className="w-full resize-none rounded-2xl border border-gray-200 px-3 py-2 text-sm font-medium leading-relaxed text-gray-800 focus:border-periwinkle-300"
                />
                <input
                  type="datetime-local"
                  name="dueAt"
                  required
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
                />
                <Button type="submit" disabled={isPending} className="w-full">
                  퀘스트 만들기
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

function TextInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 placeholder:text-gray-400 focus:border-periwinkle-300 ${className}`}
    />
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-2 py-2">
      <p className="text-base font-extrabold leading-none text-gray-900">{value}</p>
      <p className="mt-1 text-[10px] font-bold leading-none text-gray-400">{label}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-12 text-center shadow-sm md:rounded-3xl">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-gray-400">
        <HugeiconsIcon icon={BookOpen01Icon} size={26} color="currentColor" />
      </span>
      <p className="mt-4 text-sm font-extrabold text-gray-700">{title}</p>
      <p className="mt-1 text-xs font-medium text-gray-400">{description}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}
