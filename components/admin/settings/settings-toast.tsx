/**
 * 설정 저장 결과를 화면 상단에 띄우는 토스트 알림.
 * 성공/실패 아이콘과 색상만 담당하고 메시지 상태는 SettingsView가 관리한다.
 */

import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";
import type { ToastState } from "./settings-types";

export const SettingsToast = ({ toast }: { toast: ToastState }) => {
  if (!toast) return null;

  return (
    <div
      className={`fixed inset-x-4 top-4 z-50 flex items-center gap-2.5 rounded-2xl border p-4 text-sm font-semibold shadow-island animate-fadeIn sm:left-auto sm:right-4 sm:max-w-md ${
        toast.type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      <HugeiconsIcon
        icon={toast.type === "success" ? CheckmarkCircle01Icon : Cancel01Icon}
        size={18}
        color="currentColor"
      />
      <span>{toast.message}</span>
    </div>
  );
};
