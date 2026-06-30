"use server";

/**
 * 알림 관련 클라이언트 UI에서 호출하는 Server Action 진입점입니다.
 * 현재 사용자 세션을 기준으로 미읽 알림 상태 변경을 위임합니다.
 */

import { markAllNotificationsAsRead } from "./data";

// Mark all unread notifications for the current user as read.
export async function markNotificationsAsRead(): Promise<void> {
  await markAllNotificationsAsRead();
}
