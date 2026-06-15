/**
 * 관리자 앱 상단 제목과 보조 설명 도움말을 표시합니다.
 */

import { InfoHint } from "@/components/ui/info-hint";

interface HeaderProps {
  title: string;
  description?: string;
}

export const Header = ({ title, description }: HeaderProps) => (
  <header className="flex min-h-14 shrink-0 items-center border-b border-gray-200 bg-white px-4 py-3 md:h-16 md:px-6 md:py-0">
    <div className="min-w-0 flex items-center gap-2 leading-none">
      <h1 className="min-w-0 text-base font-extrabold leading-[1.1] tracking-tight text-gray-900 md:truncate">
        {title}
      </h1>
      {description && <InfoHint align="left">{description}</InfoHint>}
    </div>
  </header>
);
