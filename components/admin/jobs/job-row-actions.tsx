"use client";

/**
 * 공고 한 행에서 실행하는 승인/거절/재검토/내부 게시/공유 액션 버튼 묶음.
 * 서버 액션 호출과 router.refresh를 이 컴포넌트 안에 모아 행 UI가 가볍게 유지되도록 한다.
 */

import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowTurnBackwardIcon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Delete01Icon,
  JobShareIcon,
} from "@hugeicons/core-free-icons";
import {
  deleteRejectedJobPostings,
  markJobsPublished,
  updateJobStatus,
} from "@/app/(admin)/jobs/actions";
import { useAsyncAction } from "@/lib/ui/use-async-action";
import { buildBlogContent, buildNaverShareUrl } from "@/lib/jobs/naver-share";
import { getPublicSiteOrigin } from "@/lib/jobs/site-url";
import type { JobStatus } from "@/types/database.types";
import { AiPostPromptCopyButton } from "./ai-post-prompt-copy-button";
import { NaverShareIconLink } from "./naver-share-icon-link";
import type { JobPosting } from "./jobs-table-types";

export const JobRowActions = ({
  jobId,
  jobTitle,
  company,
  location,
  deadline,
  source,
  sourceUrl,
  status,
  publishedAt,
}: {
  jobId: string;
  jobTitle: string;
  company: string | null;
  location: string | null;
  deadline: string | null;
  source: JobPosting["source"];
  sourceUrl: string;
  status: JobStatus;
  publishedAt: string | null;
}) => {
  const router = useRouter();
  const { isPending, runAction } = useAsyncAction();

  const handle = (next: JobStatus) => {
    runAction(async () => {
      await updateJobStatus(jobId, next);
      router.refresh();
    });
  };

  const handlePublish = () => {
    runAction(async () => {
      await markJobsPublished([jobId]);
      router.refresh();
    });
  };

  const canShareToNaver = status === "approved" && Boolean(publishedAt);
  const siteOrigin = getPublicSiteOrigin();
  const naverShareUrl =
    canShareToNaver && siteOrigin
      ? buildNaverShareUrl(
          {
            id: jobId,
            title: jobTitle,
            company,
            location,
            deadline,
            source,
            source_url: sourceUrl,
          },
          siteOrigin,
        )
      : "";
  const naverDraftContent = canShareToNaver
    ? buildBlogContent({
        title: jobTitle,
        company,
        location,
        deadline,
        source,
        source_url: sourceUrl,
      })
    : "";

  if (status === "pending") {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1">
        <button
          onClick={() => void handle("approved")}
          disabled={isPending}
          title="승인"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} color="currentColor" strokeWidth={1.8} />
        </button>
        <button
          onClick={() => void handle("rejected")}
          disabled={isPending}
          title="거절"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={16} color="currentColor" strokeWidth={1.8} />
        </button>
      </div>
    );
  }

  if (status === "rejected") {
    const handleDelete = () => {
      if (!window.confirm("이 거절 공고를 DB에서 삭제할까요? 복구할 수 없습니다.")) return;
      runAction(async () => {
        await deleteRejectedJobPostings([jobId]);
        router.refresh();
      });
    };

    return (
      <div className="flex flex-wrap items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={isPending}
          title="DB에서 삭제"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <HugeiconsIcon icon={Delete01Icon} size={16} color="currentColor" strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={() => void handle("pending")}
          disabled={isPending}
          title="재검토"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <HugeiconsIcon icon={ArrowTurnBackwardIcon} size={15} color="currentColor" strokeWidth={1.8} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {status === "approved" && !publishedAt && (
        <button
          onClick={handlePublish}
          disabled={isPending}
          title="내부 게시"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-periwinkle-100 hover:text-periwinkle-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <HugeiconsIcon icon={JobShareIcon} size={16} color="currentColor" strokeWidth={1.8} />
        </button>
      )}
      {canShareToNaver && naverShareUrl && (
        <NaverShareIconLink
          href={naverShareUrl}
          title={`네이버 공유하기\n\n${naverDraftContent}`}
          iconType="a"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md transition-opacity hover:bg-emerald-50 hover:opacity-90"
        />
      )}
      {canShareToNaver && <AiPostPromptCopyButton jobId={jobId} />}
      <button
        onClick={() => void handle("pending")}
        disabled={isPending}
        title="재검토"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <HugeiconsIcon icon={ArrowTurnBackwardIcon} size={15} color="currentColor" strokeWidth={1.8} />
      </button>
    </div>
  );
};
