"use client";

/**
 * 릴레이 스터디 그룹, 멤버, 퀘스트를 관리하는 관리자 전용 화면입니다.
 */

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  Cancel01Icon,
  Search01Icon,
  UserGroupIcon,
  BookOpen01Icon,
  Settings01Icon,
  FolderLibraryIcon
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
import { EmptyState } from "@/components/ui/empty-state";
import { TextInput } from "./studies-index-common";

type AdminStudiesViewProps = {
  studies: StudyListItem[];
  studentProfiles: StudyAdminProfile[];
};

type Tab = "groups" | "members" | "quests";

type ActionResult = {
  success: boolean;
  error?: string;
};

type ActionRunner = (
  fn: () => Promise<ActionResult>,
  successText: string,
  onSuccess?: () => void
) => void;

type GroupsTabProps = {
  studies: StudyListItem[];
  selectedStudy: StudyListItem | null;
  setSelectedStudyId: (studyId: string) => void;
  run: ActionRunner;
  isPending: boolean;
};

type MembersTabProps = {
  selectedStudy: StudyListItem;
  studies: StudyListItem[];
  studentProfiles: StudyAdminProfile[];
  run: ActionRunner;
  isPending: boolean;
};

type QuestsTabProps = {
  selectedStudy: StudyListItem;
  run: ActionRunner;
  isPending: boolean;
};

export function AdminStudiesView({ studies, studentProfiles }: AdminStudiesViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("groups");
  const [selectedStudyId, setSelectedStudyId] = useState(studies[0]?.id ?? "");

  const selectedStudy = useMemo(
    () => studies.find((study) => study.id === selectedStudyId) ?? studies[0] ?? null,
    [selectedStudyId, studies]
  );

  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (
    fn: () => Promise<{ success: boolean; error?: string }>,
    successText: string,
    onSuccess?: () => void
  ) => {
    setNotice(null);
    startTransition(async () => {
      const result = await fn();
      if (result.success) {
        setNotice({ tone: "success", text: successText });
        onSuccess?.();
        router.refresh();
        return;
      }
      setNotice({ tone: "error", text: result.error ?? "작업을 완료하지 못했습니다." });
    });
  };

  return (
    <div className="flex flex-col gap-4">
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

      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("groups")}
          className={`pb-3 text-sm font-extrabold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === "groups"
              ? "border-periwinkle-600 text-periwinkle-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <HugeiconsIcon icon={FolderLibraryIcon} size={16} />
          스터디 그룹 관리
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`pb-3 text-sm font-extrabold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === "members"
              ? "border-periwinkle-600 text-periwinkle-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <HugeiconsIcon icon={UserGroupIcon} size={16} />
          멤버 관리
        </button>
        <button
          onClick={() => setActiveTab("quests")}
          className={`pb-3 text-sm font-extrabold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === "quests"
              ? "border-periwinkle-600 text-periwinkle-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <HugeiconsIcon icon={BookOpen01Icon} size={16} />
          퀘스트 관리
        </button>
      </div>

      {/* Global Study Selector for Members and Quests Tab */}
      {activeTab !== "groups" && (
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 mb-2">
          <label className="block text-sm font-extrabold text-gray-700 mb-2">관리할 스터디 선택</label>
          {studies.length === 0 ? (
             <p className="text-sm font-medium text-gray-500">운영 중인 스터디가 없습니다.</p>
          ) : (
            <select
              value={selectedStudyId}
              onChange={(e) => setSelectedStudyId(e.target.value)}
              className="w-full sm:max-w-xs rounded-xl border border-gray-300 px-3 py-2 text-sm font-bold text-gray-900 focus:border-periwinkle-500"
            >
              {studies.map(study => (
                <option key={study.id} value={study.id}>
                  {study.title} ({study.memberCount}명) - {study.status === "active" ? "운영중" : "보관됨"}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {activeTab === "groups" && (
        <GroupsTab 
          studies={studies} 
          selectedStudy={selectedStudy} 
          setSelectedStudyId={setSelectedStudyId} 
          run={run} 
          isPending={isPending} 
        />
      )}

      {activeTab === "members" && selectedStudy && (
        <MembersTab 
          selectedStudy={selectedStudy} 
          studies={studies} 
          studentProfiles={studentProfiles} 
          run={run} 
          isPending={isPending} 
        />
      )}

      {activeTab === "quests" && selectedStudy && (
        <QuestsTab 
          selectedStudy={selectedStudy} 
          run={run} 
          isPending={isPending} 
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Tab 1: Groups Management
// ------------------------------------------------------------------
function GroupsTab({ studies, selectedStudy, setSelectedStudyId, run, isPending }: GroupsTabProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr] items-start">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HugeiconsIcon icon={Add01Icon} size={18} color="currentColor" />
              새 스터디 개설
            </CardTitle>
          </CardHeader>
          <CardBody>
            <form
              action={(formData) => run(async () => createStudyGroup(formData), "스터디 그룹을 만들었습니다.")}
              className="space-y-3"
            >
              <TextInput name="title" placeholder="릴레이 스터디" required />
              <TextInput name="description" placeholder="스터디 설명" />
              <Button type="submit" disabled={isPending} className="w-full">
                스터디 개설
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>

      <div className="space-y-4">
        {selectedStudy && (
          <Card className="border-periwinkle-200 shadow-md">
            <CardHeader className="bg-periwinkle-50/50 border-b border-periwinkle-100 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-periwinkle-900">
                  <HugeiconsIcon icon={Settings01Icon} size={18} />
                  기본 정보 수정
                </CardTitle>
                <Link
                  href={`/studies/${selectedStudy.id}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-gray-700 hover:bg-gray-50"
                >
                  스터디 대시보드
                  <HugeiconsIcon icon={ArrowRight01Icon} size={13} color="currentColor" />
                </Link>
              </div>
            </CardHeader>
            <CardBody className="pt-4">
              <form
                key={selectedStudy.id}
                action={(formData) =>
                  run(async () => updateStudyGroup(selectedStudy.id, formData), "스터디 정보를 저장했습니다.")
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
        )}

        <div className="space-y-2">
          {studies.length === 0 ? (
            <EmptyState
              icon="SM"
              title="운영 중인 스터디가 없습니다"
              description="좌측에서 새 스터디 그룹을 만들어보세요."
            />
          ) : (
            studies.map((study) => (
              <button
                key={study.id}
                type="button"
                onClick={() => setSelectedStudyId(study.id)}
                className={`w-full rounded-3xl border p-4 text-left shadow-sm transition-colors ${
                  selectedStudy?.id === study.id
                    ? "border-periwinkle-300 ring-1 ring-periwinkle-200 bg-white"
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
    </div>
  );
}

// ------------------------------------------------------------------
// Tab 2: Members Management
// ------------------------------------------------------------------
function MembersTab({ selectedStudy, studies, studentProfiles, run, isPending }: MembersTabProps) {
  const [selectedUserIdsByStudyId, setSelectedUserIdsByStudyId] = useState<Record<string, string[]>>(() => 
    Object.fromEntries<string[]>(studies.map((study) => [study.id, study.memberUserIds] as const))
  );
  const [memberSearch, setMemberSearch] = useState("");
  const [isEditingMembers, setIsEditingMembers] = useState(false);

  const selectedUserIds = useMemo(() => {
    return selectedUserIdsByStudyId[selectedStudy.id] ?? selectedStudy.memberUserIds;
  }, [selectedStudy, selectedUserIdsByStudyId]);

  const profilesByUserId = useMemo(
    () => new Map<string, StudyAdminProfile>(studentProfiles.map((student) => [student.userId, student] as const)),
    [studentProfiles]
  );

  const selectedMembers = selectedUserIds.map((userId) => {
    const profile = profilesByUserId.get(userId);
    return {
      userId,
      displayName: profile?.displayName ?? profile?.email ?? userId,
      email: profile?.email ?? null,
    };
  });

  const savedMemberUserIds = selectedStudy.memberUserIds ?? [];
  const hasMemberChanges =
    selectedUserIds.length !== savedMemberUserIds.length ||
    selectedUserIds.some((userId) => !savedMemberUserIds.includes(userId));

  const filteredStudentProfiles = useMemo(() => {
    const keyword = memberSearch.trim().toLowerCase();
    if (!keyword) return studentProfiles;
    return studentProfiles.filter((student) =>
      `${student.displayName} ${student.email ?? ""}`.toLowerCase().includes(keyword)
    );
  }, [memberSearch, studentProfiles]);

  const setSelectedUserIds = (updater: (previous: string[]) => string[]) => {
    setSelectedUserIdsByStudyId((previous) => ({
      ...previous,
      [selectedStudy.id]: updater(previous[selectedStudy.id] ?? selectedStudy.memberUserIds),
    }));
  };

  const toggleStudentUserId = (userId: string, checked: boolean) => {
    setSelectedUserIds((previous) => {
      if (checked) return previous.includes(userId) ? previous : [...previous, userId];
      return previous.filter((selectedUserId) => selectedUserId !== userId);
    });
  };

  const cancelMemberEdit = () => {
    setSelectedUserIdsByStudyId((previous) => ({
      ...previous,
      [selectedStudy.id]: selectedStudy.memberUserIds,
    }));
    setMemberSearch("");
    setIsEditingMembers(false);
  };

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HugeiconsIcon icon={UserGroupIcon} size={18} color="currentColor" />
            멤버 배정
          </CardTitle>
          <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold leading-none text-gray-500">
            선택 {selectedUserIds.length}명
          </span>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {!isEditingMembers ? (
          <>
            {selectedMembers.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm font-semibold text-gray-400">
                아직 구성된 멤버가 없습니다.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map((member) => (
                  <span
                    key={member.userId}
                    className="inline-flex max-w-full rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-extrabold text-gray-700"
                  >
                    <span className="truncate">{member.displayName}</span>
                  </span>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => setIsEditingMembers(true)}
              className="w-full sm:w-auto"
            >
              멤버 편집하기
            </Button>
          </>
        ) : (
          <>
            {hasMemberChanges && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                저장되지 않은 멤버 변경사항이 있습니다.
              </div>
            )}
            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-gray-600">
                수강생 검색
              </span>
              <span className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 focus-within:border-periwinkle-300">
                <HugeiconsIcon icon={Search01Icon} size={16} color="currentColor" />
                <input
                  type="search"
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                  placeholder="이름 또는 이메일로 검색"
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-gray-800 outline-none placeholder:text-gray-400"
                />
              </span>
            </label>
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map((member) => (
                  <span
                    key={member.userId}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-periwinkle-200 bg-periwinkle-50 px-3 py-1.5 text-xs font-extrabold text-periwinkle-700"
                  >
                    <span className="truncate">{member.displayName}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedUserIds((previous) =>
                          previous.filter((userId) => userId !== member.userId)
                        )
                      }
                      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-periwinkle-500 hover:bg-periwinkle-100 hover:text-periwinkle-700"
                      aria-label={`${member.displayName} 멤버 제거`}
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={12} color="currentColor" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStudentProfiles.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-gray-200 py-8 text-center text-sm font-semibold text-gray-400 sm:col-span-full">
                  선택 가능한 수강생이 없습니다.
                </p>
              ) : (
                filteredStudentProfiles.map((student) => {
                  const checked = selectedUserIds.includes(student.userId);
                  return (
                    <label
                      key={student.userId}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 ${
                        checked
                          ? "border-periwinkle-200 bg-periwinkle-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          toggleStudentUserId(student.userId, event.target.checked)
                        }
                        className="h-4 w-4 accent-periwinkle-600"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-extrabold text-gray-800">
                          {student.displayName}
                        </span>
                        <span className="block truncate text-[11px] font-medium text-gray-400">
                          {student.email ?? student.userId}
                        </span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 pt-2 border-t border-gray-100">
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={cancelMemberEdit}
                className="w-full"
              >
                취소
              </Button>
              <Button
                type="button"
                disabled={isPending}
                onClick={() =>
                  run(
                    async () => saveStudyGroupMembers(selectedStudy.id, selectedUserIds),
                    "스터디 멤버를 저장했습니다.",
                    () => {
                      setMemberSearch("");
                      setIsEditingMembers(false);
                    }
                  )
                }
                className="w-full"
              >
                멤버 저장
              </Button>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

// ------------------------------------------------------------------
// Tab 3: Quests Management
// ------------------------------------------------------------------
function QuestsTab({ selectedStudy, run, isPending }: QuestsTabProps) {
  const [minDueAt, setMinDueAt] = useState("");

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HugeiconsIcon icon={Calendar01Icon} size={18} color="currentColor" />
          새 퀘스트 등록
        </CardTitle>
      </CardHeader>
      <CardBody>
        <form
          action={(formData) =>
            run(
              async () => createStudyQuest(selectedStudy.id, formData),
              "릴레이 퀘스트를 만들었습니다."
            )
          }
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-extrabold text-gray-600 mb-1.5">퀘스트 제목</label>
            <TextInput name="scriptTitle" placeholder="이번 주 뉴스 원고" required />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-gray-600 mb-1.5">원고 내용</label>
            <textarea
              name="scriptContent"
              required
              rows={10}
              placeholder="원고 내용을 입력하세요"
              className="w-full resize-none rounded-2xl border border-gray-200 px-3 py-3 text-sm font-medium leading-relaxed text-gray-800 focus:border-periwinkle-300"
            />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-gray-600 mb-1.5">
              마감일과 시간
            </label>
            <input
              type="datetime-local"
              name="dueAt"
              required
              min={minDueAt}
              onFocus={() => setMinDueAt(formatNextDateTimeLocalMinute(new Date()))}
              aria-label="퀘스트 마감일과 시간"
              className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-periwinkle-300"
            />
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={isPending} className="w-full">
              퀘스트 만들기
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function formatNextDateTimeLocalMinute(date: Date) {
  const nextMinute = new Date(date);
  nextMinute.setMinutes(nextMinute.getMinutes() + 1, 0, 0);

  const year = nextMinute.getFullYear();
  const month = padDatePart(nextMinute.getMonth() + 1);
  const day = padDatePart(nextMinute.getDate());
  const hour = padDatePart(nextMinute.getHours());
  const minute = padDatePart(nextMinute.getMinutes());

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}
