"use client";

/**
 * 로그인 폼 컴포넌트.
 * Google, Naver OAuth 소셜 로그인을 제공.
 * 버튼 클릭 시 즉시 로딩 상태(스피너 + disabled)로 전환해 중복 클릭 방지.
 */

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

type Provider = "google" | "naver";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [loading, setLoading] = useState<Provider | null>(null);

  const handleSignIn = (provider: Provider) => {
    if (loading) return;
    setLoading(provider);
    // signIn은 OAuth 리디렉션을 시작하므로 완료 콜백 불필요
    void signIn(provider, { callbackUrl });
  };

  const isLoading = loading !== null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <section className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-extrabold leading-[1.1] tracking-tight text-gray-900">로그인</h1>
        <p className="mt-1 text-sm leading-tight text-gray-500">구글 또는 네이버 계정으로 로그인하세요.</p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            id="login-google"
            type="button"
            onClick={() => handleSignIn("google")}
            disabled={isLoading}
            className="relative rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold leading-none text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === "google" ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                연결 중…
              </span>
            ) : (
              "Google로 로그인"
            )}
          </button>

          <button
            id="login-naver"
            type="button"
            onClick={() => handleSignIn("naver")}
            disabled={isLoading}
            className="rounded-full bg-periwinkle-600 px-4 py-2.5 text-sm font-semibold leading-none text-white transition-colors hover:bg-periwinkle-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === "naver" ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-periwinkle-300 border-t-white" />
                연결 중…
              </span>
            ) : (
              "Naver로 로그인"
            )}
          </button>
        </div>
      </section>
    </main>
  );
}
