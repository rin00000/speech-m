/**
 * 현재 사용자에게 표시할 인앱 알림을 조회하고 읽음 상태를 갱신하는 데이터 모듈입니다.
 * 레이아웃과 알림 서버 액션에서 공통으로 사용되는 알림 row 매핑을 담당합니다.
 */

import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/server";

export type UserNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

// Fetch up to 30 unread notifications for the current authenticated user.
export async function getMyUnreadNotifications(userId?: string | null): Promise<UserNotification[]> {
  const currentUserId = userId ?? (await getCurrentUser())?.userId ?? null;
  if (!currentUserId) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("user_notifications")
    .select("id, type, title, body, read_at, created_at")
    .eq("user_id", currentUserId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(30)
    .returns<NotificationRow[]>();

  if (error) {
    console.error("[notifications] getMyUnreadNotifications error", error);
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

// Mark every unread notification for the current authenticated user as read.
export async function markAllNotificationsAsRead(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.userId)
    .is("read_at", null);

  if (error) {
    console.error("[notifications] markAllNotificationsAsRead error", error);
    throw error;
  }
}

