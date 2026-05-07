"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import type { JobStatus } from "@/types/database.types";

export const updateJobStatus = async (id: string, status: JobStatus) => {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("job_postings")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/jobs");
};

export const bulkUpdateJobStatus = async (ids: string[], status: JobStatus) => {
  if (!ids.length) return;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("job_postings")
    .update({ status })
    .in("id", ids);

  if (error) throw new Error(error.message);
  revalidatePath("/jobs");
};
