/**
 * 프로토타입 카탈로그의 실시간 렌더링 쇼케이스.
 * 각 도메인 데모를 순서대로 배치하고 공통 카드 스타일을 전달한다.
 */

import type { UserRole } from "@/lib/auth/session";
import { cn } from "@/lib/ui/cn";
import { PrototypeAppShellDemo } from "./prototype-app-shell-demo";
import { PrototypeJobQueueDemo } from "./prototype-job-queue-demo";
import { PrototypeStudyOpsDemo } from "./prototype-study-ops-demo";

type PrototypeShowcaseProps = {
  userName: string | null;
  role: UserRole;
  roundingClass: string;
  cardBgClass: string;
  glowClass: string;
};

export function PrototypeShowcase({
  userName,
  role,
  roundingClass,
  cardBgClass,
  glowClass,
}: PrototypeShowcaseProps) {
  return (
    <main className={cn("space-y-8", roundingClass)}>
      <div className="space-y-6">
        <PrototypeJobQueueDemo cardBgClass={cardBgClass} glowClass={glowClass} />
        <PrototypeStudyOpsDemo cardBgClass={cardBgClass} glowClass={glowClass} />
        <PrototypeAppShellDemo
          cardBgClass={cardBgClass}
          glowClass={glowClass}
          role={role}
          userName={userName}
        />
      </div>
    </main>
  );
}
