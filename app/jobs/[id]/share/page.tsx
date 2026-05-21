import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  buildBlogContent,
  buildJobShareMetaDescription,
  buildJobSharePagePath,
  buildJobShareTitle,
} from "@/lib/jobs/naver-share";
import { getPublicSiteOrigin } from "@/lib/jobs/site-url";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type JobPosting = Database["public"]["Tables"]["job_postings"]["Row"];

type PageProps = { params: Promise<{ id: string }> };

const loadPublishedApprovedJob = async (id: string): Promise<JobPosting | null> => {
  const supabase = createAdminClient();
  const { data } = await supabase.from("job_postings").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  if (data.status !== "approved" || !data.published_at) return null;
  return data;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const job = await loadPublishedApprovedJob(id);
  if (!job) {
    return {
      title: "공고를 찾을 수 없습니다",
      robots: { index: false, follow: false },
    };
  }

  const title = buildJobShareTitle(job);
  const description = buildJobShareMetaDescription(job);
  const origin = getPublicSiteOrigin();
  const path = buildJobSharePagePath(id);
  const canonical = origin ? `${origin}${path}` : path;

  return {
    title,
    description,
    ...(origin ? { metadataBase: new URL(origin) } : {}),
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots: { index: false, follow: false },
  };
}

export default async function JobShareLandingPage({ params }: PageProps) {
  const { id } = await params;
  const job = await loadPublishedApprovedJob(id);
  if (!job) notFound();

  const title = buildJobShareTitle(job);
  const body = buildBlogContent(job);

  return (
    <article className="mx-auto max-w-xl px-4 py-10 text-gray-800">
      <h1 className="text-lg font-extrabold leading-[1.1] tracking-tight text-gray-900">{title}</h1>
      <div className="mt-4 whitespace-pre-wrap rounded-3xl border border-gray-200 bg-white p-4 text-sm leading-snug shadow-sm">
        {body}
      </div>
      <p className="mt-6 text-sm text-gray-600">
        <Link
          href={job.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-periwinkle-700 underline decoration-periwinkle-300 underline-offset-2 hover:text-periwinkle-800"
        >
          원문 공고 보기
        </Link>
      </p>
    </article>
  );
}
