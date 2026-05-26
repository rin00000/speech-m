import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getPostLoginRedirect } from "@/lib/auth/redirects";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(getPostLoginRedirect(user));

  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-white">
      <div className="flex-1 bg-bg" />
      <div className="flex w-full flex-col items-center bg-white pb-14 pt-2">
        <div className="flex w-full max-w-sm flex-col gap-3 px-6">
          <div className="h-14 animate-pulse rounded-full bg-gray-200" />
          <div className="h-14 animate-pulse rounded-full bg-gray-100" />
          <div className="h-12 animate-pulse rounded-full bg-gray-50" />
        </div>
      </div>
    </main>
  );
}
