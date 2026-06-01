"use server";

/**
 * 대시보드 라우트에서 공개하는 Server Action 진입점.
 * 실제 구현은 `_actions`에 두고 외부 컴포넌트는 이 파일만 import한다.
 */

import {
  approveStudentUpgradeRequest as approveStudentUpgradeRequestAction,
  rejectStudentUpgradeRequest as rejectStudentUpgradeRequestAction,
  submitStudentUpgradeRequest as submitStudentUpgradeRequestAction,
} from "./_actions/student-upgrade-actions";

export async function submitStudentUpgradeRequest(message?: string) {
  return submitStudentUpgradeRequestAction(message);
}

export async function approveStudentUpgradeRequest(requestId: string) {
  return approveStudentUpgradeRequestAction(requestId);
}

export async function rejectStudentUpgradeRequest(requestId: string) {
  return rejectStudentUpgradeRequestAction(requestId);
}
