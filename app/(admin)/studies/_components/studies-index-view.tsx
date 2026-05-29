"use client";

/**
 * /studies 진입 화면의 역할별 라우터 컴포넌트.
 * 관리자와 수강생 화면을 분기만 하도록 유지해 각 화면의 수정 범위를 작게 만든다.
 */

import type { UserRole } from "@/lib/auth/session";
import type { StudyAdminProfile, StudyListItem } from "@/lib/studies/data";
import { AdminStudiesView } from "./admin-studies-view";
import { StudentStudiesView } from "./student-studies-view";

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
