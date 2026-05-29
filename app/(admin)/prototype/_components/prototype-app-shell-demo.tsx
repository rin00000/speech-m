/**
 * 프로토타입 쇼케이스의 반응형 AppShell 데모.
 * 역할 전환 상태가 실제 앱 셸 프리뷰에 어떻게 반영되는지 보여준다.
 */

import { AppShell } from "@/components/app/layout/app-shell";
import type { UserRole } from "@/lib/auth/session";
import { cn } from "@/lib/ui/cn";

type PrototypeAppShellDemoProps = {
  cardBgClass: string;
  glowClass: string;
  role: UserRole;
  userName: string | null;
};

export function PrototypeAppShellDemo({
  cardBgClass,
  glowClass,
  role,
  userName,
}: PrototypeAppShellDemoProps) {
  return (
    <div className={cn("p-6 transition-all duration-300", cardBgClass, glowClass)}>
      <div className="mb-4 space-y-1">
        <span className="inline-flex rounded-full border border-periwinkle-200 bg-periwinkle-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-periwinkle-700">
          Responsive AppShell
        </span>
        <h3 className="mt-1 text-base font-extrabold leading-tight text-gray-900">
          사이드바 / 바텀탭 레이아웃 체계
        </h3>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-gray-50 p-1 shadow-inner">
        <AppShell userRole={role} userName={userName} previewPathname="/dashboard">
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-gray-900">운영 대시보드 홈</h4>
              <span className="text-[10px] font-semibold text-gray-400">
                스프레드시트 뷰 통합
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["전체", "139건"],
                ["대기", "41건"],
                ["완료", "98건"],
              ].map(([title, value]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-gray-200 bg-white p-3 text-center shadow-sm"
                >
                  <span className="text-[9px] font-bold text-gray-400">{title}</span>
                  <p className="mt-0.5 text-sm font-extrabold text-gray-900">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </AppShell>
      </div>
    </div>
  );
}
