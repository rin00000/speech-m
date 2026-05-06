"use client";

import { useTransition } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle01Icon,
  Cancel01Icon,
  ArrowTurnBackwardIcon,
} from "@hugeicons/core-free-icons";
import { updateJobStatus } from "@/app/(admin)/jobs/actions";
import type { JobStatus } from "@/types/database.types";

type Props = {
  jobId: string;
  status: JobStatus;
};

export const JobActions = ({ jobId, status }: Props) => {
  const [isPending, startTransition] = useTransition();

  const handle = (next: JobStatus) => {
    startTransition(() => {
      updateJobStatus(jobId, next);
    });
  };

  if (status === "pending") {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => handle("approved")}
          disabled={isPending}
          title="승인"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <HugeiconsIcon
            icon={CheckmarkCircle01Icon}
            size={16}
            color="currentColor"
            strokeWidth={1.8}
          />
        </button>
        <button
          onClick={() => handle("rejected")}
          disabled={isPending}
          title="거절"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <HugeiconsIcon
            icon={Cancel01Icon}
            size={16}
            color="currentColor"
            strokeWidth={1.8}
          />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => handle("pending")}
      disabled={isPending}
      title="재검토"
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <HugeiconsIcon
        icon={ArrowTurnBackwardIcon}
        size={15}
        color="currentColor"
        strokeWidth={1.8}
      />
    </button>
  );
};
