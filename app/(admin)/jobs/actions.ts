"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import type { JobStatus } from "@/types/database.types";

type ActionStatus = Extract<JobStatus, "approved" | "rejected" | "pending">;

export const updateJobStatus = async (id: string, status: ActionStatus) => {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("job_postings")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/jobs");
};
