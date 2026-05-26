import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getPostLoginRedirect } from "@/lib/auth/redirects";

/**
 * OAuth 완료 후 세션을 다시 확인하고 역할별 첫 화면으로 보낸다.
 * 기본 callbackUrl로 사용되어 신규 guest는 공개 공고부터 보게 한다.
 */
export default async function AfterLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [{ callbackUrl }, user] = await Promise.all([
    searchParams,
    getCurrentUser(),
  ]);

  redirect(getPostLoginRedirect(user, callbackUrl));
}
