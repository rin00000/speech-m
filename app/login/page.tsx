import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getPostLoginRedirect, getSafeCallbackPath } from "@/lib/auth/redirects";
import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [{ callbackUrl: rawCallbackUrl }, user] = await Promise.all([
    searchParams,
    getCurrentUser(),
  ]);
  const callbackUrl = getSafeCallbackPath(rawCallbackUrl) ?? "/auth/after-login";
  if (user) redirect(getPostLoginRedirect(user, callbackUrl));

  return <LoginForm callbackUrl={callbackUrl} />;
}
