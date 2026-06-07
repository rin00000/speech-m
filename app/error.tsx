"use client";

import { useEffect } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center p-4">
      <EmptyState
        icon="🚨"
        title="오류가 발생했습니다"
        description={
          <>
            일시적인 문제가 발생했습니다.<br />
            잠시 후 다시 시도해 주세요.
          </>
        }
        action={
          <Button onClick={() => reset()} variant="primary" className="mt-2">
            다시 시도
          </Button>
        }
        className="max-w-md bg-white shadow-sm border-gray-100"
      />
    </div>
  );
}
