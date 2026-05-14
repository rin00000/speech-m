"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">로그인</h1>
        <p className="mt-1 text-sm text-slate-500">구글 또는 네이버 계정으로 로그인하세요.</p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl })}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Google로 로그인
          </button>
          <button
            type="button"
            onClick={() => signIn("naver", { callbackUrl })}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Naver로 로그인
          </button>
        </div>
      </section>
    </main>
  );
}
