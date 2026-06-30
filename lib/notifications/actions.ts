"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { markAllNotificationsAsRead } from "./data";

/**
 * 현재 로그인 유저의 모든 미읽 알림을 읽음 처리합니다.
 */
export async function markNotificationsAsRead(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await markAllNotificationsAsRead(user.userId);
}
