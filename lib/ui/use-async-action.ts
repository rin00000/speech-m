"use client";

/**
 * 비동기 Server Action 실행용 범용 훅.
 * useTransition 기반으로 isPending 상태를 관리하며,
 * LoadingContext와 연동해 글로벌 Progress Bar에 자동 반영한다.
 * 중복 클릭 방지(isPending 중 disabled)와 에러 핸들링을 내장한다.
 */

import { useTransition } from "react";
import { useLoading } from "./loading-context";

type AsyncActionOptions = {
  /** 작업 완료 후 router.refresh() 등을 원하면 onSettled에 전달 */
  onSettled?: () => void;
  /** 에러 발생 시 실행할 콜백 */
  onError?: (err: unknown) => void;
};

export const useAsyncAction = (options?: AsyncActionOptions) => {
  const { startLoading, stopLoading } = useLoading();
  const [isPending, startTransition] = useTransition();

  const runAction = (fn: () => Promise<void>) => {
    startLoading();
    startTransition(async () => {
      try {
        await fn();
      } catch (err) {
        options?.onError?.(err);
      } finally {
        stopLoading();
        options?.onSettled?.();
      }
    });
  };

  return { isPending, runAction };
};
