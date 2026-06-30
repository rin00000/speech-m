"use client";

/**
 * 미읽 알림 수 뱃지와 드롭다운 목록을 표시하는 알림 벨 컴포넌트.
 * 드롭다운이 열리는 순간 서버 액션으로 전체 읽음 처리합니다.
 */

import { useState, useRef, useEffect, useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notification02Icon } from "@hugeicons/core-free-icons";
import type { UserNotification } from "@/lib/notifications/data";
import { markNotificationsAsRead } from "@/lib/notifications/actions";
import { cn } from "@/lib/ui/cn";

type NotificationBellProps = {
  initialNotifications: UserNotification[];
};

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}일 전`;
}

export function NotificationBell({ initialNotifications }: NotificationBellProps) {
  const [readNotificationMarks, setReadNotificationMarks] = useState<Record<string, string>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  const notifications = initialNotifications.map((notification) => {
    const readAt = readNotificationMarks[notification.id];
    return readAt ? { ...notification, readAt } : notification;
  });
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  // Mark notifications as read when the dropdown opens.
  const handleOpen = () => {
    setIsOpen(true);
    const unreadNotifications = notifications.filter((notification) => !notification.readAt);
    if (unreadNotifications.length > 0) {
      const previousMarks = readNotificationMarks;
      const readAt = new Date().toISOString();
      setReadNotificationMarks({
        ...previousMarks,
        ...Object.fromEntries(unreadNotifications.map((notification) => [notification.id, readAt])),
      });
      startTransition(async () => {
        try {
          await markNotificationsAsRead();
        } catch (error) {
          console.error("[notifications] failed to mark notifications as read", error);
          setReadNotificationMarks(previousMarks);
        }
      });
    }
  };

  // Close on outside pointer down.
  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : handleOpen())}
        aria-label={`알림 ${unreadCount > 0 ? `${unreadCount}개 미읽` : "없음"}`}
        aria-expanded={isOpen}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
          isOpen
            ? "border-periwinkle-200 bg-periwinkle-50 text-periwinkle-700"
            : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        )}
      >
        <HugeiconsIcon icon={Notification02Icon} size={18} color="currentColor" strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-periwinkle-600 text-[9px] font-extrabold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
          role="dialog"
          aria-label="알림 목록"
        >
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-extrabold text-gray-900">알림</p>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm font-medium text-gray-400">
              새 알림이 없습니다.
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id} className="px-4 py-3">
                  <p className="text-xs font-extrabold text-gray-900">{n.title}</p>
                  <p className="mt-1 text-xs font-medium leading-snug text-gray-600">{n.body}</p>
                  <p className="mt-1.5 text-[11px] font-medium text-gray-400">
                    {formatRelativeTime(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
