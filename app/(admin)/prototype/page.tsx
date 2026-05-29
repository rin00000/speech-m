/**
 * /prototype 라우트 페이지.
 * 로그인 사용자의 역할을 기준으로 UI 프로토타입 카탈로그를 렌더링한다.
 */

import { PrototypeCatalog } from "./_components/prototype-catalog";
import { requireUser } from "@/lib/auth/session";

export default async function PrototypePage() {
  const user = await requireUser();

  return <PrototypeCatalog userName={user.name} initialRole={user.role} />;
}
