"use client";

/**
 * 관리자용 스터디 운영 화면.
 * 스터디 생성/선택 상태와 멤버·퀘스트 저장 액션을 한곳에서 조율한다.
 */

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import type { StudyAdminProfile, StudyListItem } from "@/lib/studies/data";
import {
  createStudyGroup,
  createStudyQuest,
  saveStudyGroupMembers,
  updateStudyGroup,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, TextInput } from "./studies-index-common";

type AdminStudiesViewProps = {
  studies: StudyListItem[];
  studentProfiles: StudyAdminProfile[];
};

export function AdminStudiesView({ studies, studentProfiles }: AdminStudiesViewProps) {
  const router = useRouter();
  const [selectedStudyId, setSelectedStudyId] = useState(studies[0]?.id ?? "");
  const selectedStudy = useMemo(
    () => studies.find((study) => study.id === selectedStudyId) ?? studies[0] ?? null,
    [selectedStudyId, studies],
  );
  const [selectedEmailsByStudyId, setSelectedEmailsByStudyId] = useState<Record<string, string[]>>(
    () => Object.fromEntries(studies.map((study) => [study.id, study.memberEmails])),
  );
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedEmails = selectedStudy
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
              <HugeiconsIcon icon={Add01Icon} size={18} color="currentColor" />새 스터디
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
                <HugeiconsIcon icon={Calendar01Icon} size={18} color="currentColor" />새 퀘스트
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
