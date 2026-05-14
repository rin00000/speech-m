import { Suspense } from "react";
import LoginForm from "./login-form";

function LoginFormFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-7 w-24 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-full max-w-[280px] animate-pulse rounded bg-slate-100" />
        <div className="mt-6 flex flex-col gap-3">
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
