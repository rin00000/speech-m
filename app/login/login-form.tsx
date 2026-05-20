"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <section className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-extrabold leading-[1.1] tracking-tight text-gray-900">로그인</h1>
        <p className="mt-1 text-sm leading-tight text-gray-500">구글 또는 네이버 계정으로 로그인하세요.</p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl })}
            className="rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold leading-none text-gray-700 hover:bg-gray-50"
          >
            Google로 로그인
          </button>
          <button
            type="button"
            onClick={() => signIn("naver", { callbackUrl })}
            className="rounded-full bg-periwinkle-600 px-4 py-2.5 text-sm font-semibold leading-none text-white hover:bg-periwinkle-700"
          >
            Naver로 로그인
          </button>
        </div>
      </section>
    </main>
  );
}
