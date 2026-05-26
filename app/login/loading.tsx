/**
 * 로그인 페이지 로딩 스켈레톤.
 * 새 통합 Start+Login 화면의 레이아웃에 맞춘 뼈대 UI.
 */

export default function LoginLoading() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-white">
      <div className="flex-1 bg-bg" />
      <div className="flex w-full flex-col items-center bg-white pb-14 pt-2">
        <div className="flex w-full max-w-sm flex-col gap-3 px-6">
          <div className="h-14 animate-pulse rounded-full bg-gray-200" />
          <div className="h-14 animate-pulse rounded-full bg-gray-100" />
          <div className="mt-1 h-12 animate-pulse rounded-full bg-gray-50" />
        </div>
      </div>
    </main>
  );
}
