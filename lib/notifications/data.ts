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

/**
 * 미읽 알림 목록을 최신순으로 최대 30개 조회합니다.
 */
export async function getMyUnreadNotifications(
  userId: string
): Promise<UserNotification[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("user_notifications")
    .select("id, type, title, body, read_at, created_at")
    .eq("user_id", userId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(30)
    .returns<NotificationRow[]>();

  if (error) {
    console.error("[notifications] getMyUnreadNotifications error", error);
    return [];
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

/**
 * 해당 유저의 모든 미읽 알림을 읽음 처리합니다.
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("user_notifications") as any)
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
}

