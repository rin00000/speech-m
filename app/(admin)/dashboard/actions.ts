"use server";

/**
 * 대시보드 라우트에서 공개하는 Server Action 진입점.
 * 실제 구현은 `_actions`에 두고 외부 컴포넌트는 이 파일만 import한다.
 */

export {
  approveStudentUpgradeRequest,
  rejectStudentUpgradeRequest,
  submitStudentUpgradeRequest,
} from "./_actions/student-upgrade-actions";
