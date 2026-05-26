"use client";

/**
 * 로그인 폼 컴포넌트 (통합 Start+Login 화면).
 * Google, Naver OAuth 소셜 로그인을 제공.
 * 버튼 클릭 시 즉시 로딩 상태(스피너 + disabled)로 전환해 중복 클릭 방지.
 */

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { getSafeCallbackPath } from "@/lib/auth/redirects";

type Provider = "google" | "naver";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackPath(searchParams.get("callbackUrl")) ?? "/auth/after-login";
  const [loading, setLoading] = useState<Provider | null>(null);

  const handleSignIn = (provider: Provider) => {
    if (loading) return;
    setLoading(provider);
    void signIn(provider, { callbackUrl });
  };

  const isLoading = loading !== null;

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-white">
      <style>{`
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbit-reverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes orbit-ccw {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes orbit-reverse-ccw {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-enter {
          animation: fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-enter-delay {
          opacity: 0;
          animation: fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
        }
      `}</style>

      {/* ─── Top: Illustration Area ─── */}
      <div className="relative flex w-full flex-[1.4] flex-col items-center overflow-hidden bg-bg pt-[12vh]">
        {/* Glowing orbs background */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute -left-[10%] -top-[10%] h-[80%] w-[80%] rounded-full bg-rose-300/40 blur-[100px]" />
          <div className="absolute -right-[10%] top-[20%] h-[70%] w-[70%] rounded-full bg-blue-300/40 blur-[120px]" />
          <div className="absolute -bottom-[20%] left-[10%] h-[60%] w-[60%] rounded-full bg-purple-300/40 blur-[100px]" />
        </div>

        {/* Logo and Title */}
        <div className="animate-enter relative z-20 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/20 shadow-sm backdrop-blur-md">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 text-white drop-shadow-md">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </div>
          <h1 className="font-serif text-[30px] font-medium tracking-tight text-white drop-shadow-md">
            Speech-M
          </h1>
        </div>

        {/* Orbital Animation */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {/* Center star */}
          <div
            className="absolute z-10 flex h-20 w-20 items-center justify-center"
            style={{ animation: "float-slow 4s ease-in-out infinite" }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-12 w-12 text-amber-300 drop-shadow-lg">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
          </div>

          {/* Orbit 1 - Inner */}
          <div
            className="absolute rounded-full border border-white/20"
            style={{ width: 170, height: 170, animation: "orbit 22s linear infinite" }}
          >
            <OrbitItem emoji="🎤" colorClass="bg-rose-100/90" pos="top-center" duration="22s" dir="cw" />
            <OrbitItem emoji="👔" colorClass="bg-blue-100/90" pos="bottom-center" duration="22s" dir="cw" />
          </div>

          {/* Orbit 2 - Middle */}
          <div
            className="absolute rounded-full border border-white/15"
            style={{ width: 268, height: 268, animation: "orbit-ccw 33s linear infinite" }}
          >
            <OrbitItem emoji="🌟" colorClass="bg-amber-100/90" pos="right-center" duration="33s" dir="ccw" />
            <OrbitItem emoji="📝" colorClass="bg-emerald-100/90" pos="left-center" duration="33s" dir="ccw" />
          </div>

          {/* Orbit 3 - Outer */}
          <div
            className="absolute rounded-full border border-white/10"
            style={{ width: 360, height: 360, animation: "orbit 45s linear infinite" }}
          >
            <OrbitItem emoji="🎥" colorClass="bg-purple-100/90" pos="top-left" duration="45s" dir="cw" />
            <OrbitItem emoji="✨" colorClass="bg-pink-100/90" pos="bottom-right" duration="45s" dir="cw" />
          </div>
        </div>

        {/* Gradient fade into white */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/70 to-transparent" />
      </div>

      {/* ─── Bottom: Login Action Area ─── */}
      <div className="animate-enter-delay relative z-10 flex w-full flex-col items-center bg-white pb-14 pt-2">
        <div className="flex w-full max-w-sm flex-col gap-3 px-6">
          {/* Google 버튼 */}
          <button
            id="login-google"
            type="button"
            onClick={() => handleSignIn("google")}
            disabled={isLoading}
            className="relative flex w-full items-center justify-center gap-3 rounded-full bg-[#1A1A1A] px-4 py-4 text-[1.05rem] font-semibold tracking-tight text-white shadow-sm transition-transform hover:scale-[0.99] active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading === "google" ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-white" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            <span>Google로 시작하기</span>
          </button>

          {/* Naver 버튼 */}
          <button
            id="login-naver"
            type="button"
            onClick={() => handleSignIn("naver")}
            disabled={isLoading}
            className="relative flex w-full items-center justify-center gap-3 rounded-full bg-[#F2F2F2] px-4 py-4 text-[1.05rem] font-semibold tracking-tight text-black transition-all hover:scale-[0.99] hover:bg-[#e8e8e8] active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading === "naver" ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#03C75A]" fill="currentColor" aria-hidden="true">
                <path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
              </svg>
            )}
            <span>Naver로 시작하기</span>
          </button>

          <Link
            href="/jobs"
            className="relative mt-1 flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-3 text-[0.95rem] font-semibold text-gray-600 transition-colors hover:border-periwinkle-200 hover:bg-periwinkle-50 hover:text-periwinkle-700 active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 7h-8" />
              <path d="M20 12h-8" />
              <path d="M20 17h-8" />
              <path d="M4 7h1" />
              <path d="M4 12h1" />
              <path d="M4 17h1" />
            </svg>
            채용공고 먼저 보기
          </Link>
        </div>
      </div>
    </main>
  );
}

// ─── Helper: Orbital Item ───────────────────────────────────────────────────
type OrbitalPos = "top-center" | "bottom-center" | "left-center" | "right-center" | "top-left" | "bottom-right";

const POS_CLASSES: Record<OrbitalPos, string> = {
  "top-center":    "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2",
  "bottom-center": "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
  "left-center":   "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
  "right-center":  "right-0 top-1/2 translate-x-1/2 -translate-y-1/2",
  "top-left":      "left-[14.6%] top-[14.6%] -translate-x-1/2 -translate-y-1/2",
  "bottom-right":  "bottom-[14.6%] right-[14.6%] translate-x-1/2 translate-y-1/2",
};

function OrbitItem({
  emoji,
  colorClass,
  pos,
  duration,
  dir,
}: {
  emoji: string;
  colorClass: string;
  pos: OrbitalPos;
  duration: string;
  dir: "cw" | "ccw";
}) {
  const counterAnim = dir === "cw" ? "orbit-reverse" : "orbit-reverse-ccw";
  return (
    <div className={`absolute flex h-12 w-12 items-center justify-center rounded-full bg-white/30 p-[2px] shadow backdrop-blur-sm ${POS_CLASSES[pos]}`}>
      <div
        className="flex h-full w-full items-center justify-center rounded-full bg-white/90 shadow-sm"
        style={{ animation: `${counterAnim} ${duration} linear infinite` }}
      >
        <div className={`flex h-full w-full items-center justify-center rounded-full text-xl ${colorClass}`}>
          {emoji}
        </div>
      </div>
    </div>
  );
}
