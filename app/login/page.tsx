/**
 * 로그인 페이지의 서버 컴포넌트 엔트리입니다.
 * callbackUrl을 서버에서 안전하게 정규화하고, 이미 로그인한 사용자는 역할별 목적지로 리다이렉트합니다.
 */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getPostLoginRedirect, getSafeCallbackPath } from "@/lib/auth/redirects";
import LoginForm from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
};

const LoginPage = async ({
  searchParams,
}: LoginPageProps) => {
  const [{ callbackUrl: rawCallbackUrl }, user] = await Promise.all([
    searchParams,
    getCurrentUser(),
  ]);
  const rawCallbackPath = Array.isArray(rawCallbackUrl)
    ? rawCallbackUrl[0]
    : rawCallbackUrl;
  const callbackUrl = getSafeCallbackPath(rawCallbackPath) ?? "/auth/after-login";
  if (user) redirect(getPostLoginRedirect(user, callbackUrl));

  return <LoginForm callbackUrl={callbackUrl} />;
};

export default LoginPage;
