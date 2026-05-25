"use client";

/**
 * 글로벌 로딩 상태 Context.
 * 비동기 Server Action 버튼 클릭 시 Progress Bar와 연동하기 위한 중앙 상태 관리.
 * useLoading() 훅으로 startLoading / stopLoading / isLoading 사용 가능.
 * AppShell 최상단에서 LoadingProvider로 감싸야 한다.
 * nprogress-v2를 직접 임포트해 Progress Bar를 수동 제어한다.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { NProgress } from "nprogress-v2";

type LoadingContextValue = {
  isLoading: boolean;
  isNavigating: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  startNavigation: () => void;
};

const LoadingContext = createContext<LoadingContextValue>({
  isLoading: false,
  isNavigating: false,
  startLoading: () => {},
  stopLoading: () => {},
  startNavigation: () => {},
});

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const countRef = useRef(0);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /**
   * Next.js App Router 페이지 이동 완료 감지:
   * URL 경로(pathname)나 쿼리 스트링(searchParams)이 변경되면 페이지 이동이 완료된 것이므로,
   * 로딩 프로그레스 바와 네비게이션 스켈레톤 상태를 강제 리셋한다.
   */
  useEffect(() => {
    countRef.current = 0;
    setIsLoading(false);
    setIsNavigating(false);
    NProgress.done();
  }, [pathname, searchParams]);

  const startLoading = useCallback(() => {
    countRef.current += 1;
    setIsLoading(true);
    NProgress.start();
  }, []);

  const stopLoading = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    if (countRef.current === 0) {
      setIsLoading(false);
      NProgress.done();
    }
  }, []);

  const startNavigation = useCallback(() => {
    countRef.current = 0; // 네비게이션은 모든 로딩 상태를 클리어하고 새로 시작
    setIsLoading(true);
    setIsNavigating(true);
    NProgress.start();
  }, []);

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        isNavigating,
        startLoading,
        stopLoading,
        startNavigation,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);

