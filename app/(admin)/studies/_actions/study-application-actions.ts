"use server";

/**
 * 릴레이 스터디 참여 신청과 관리자 승인/거절을 처리하는 Server Action 모듈입니다.
 * 학생 신청은 테이블에 저장하고, 관리자 처리는 원자 RPC에 위임합니다.
 */

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/server";
import {
  studyApplicationMessageSchema,
  studyApplicationRpcErrorMessages,
  uuidSchema,
  type ActionResult,
} from "./action-schemas";
import { requireAdminActor } from "./relay-action-helpers";

export async function submitStudyApplication(
  message?: string
): Promise<ActionResult<{ requestedAt: string }>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return { success: false, error: "정회원 수강생만 릴레이 스터디 신청을 보낼 수 있습니다." };
  }

  const parsedMessage = studyApplicationMessageSchema.safeParse(message);
  if (!parsedMessage.success) {
    return {
      success: false,
      error: parsedMessage.error.issues[0]?.message ?? "신청 메모가 올바르지 않습니다.",
    };
  }

  const requestedAt = new Date().toISOString();
  const cleanedMessage = parsedMessage.data ?? "";
  const supabase = createAdminClient();

  const { data: existingApplication, error: existingError } = await supabase
    .from("study_applications")
    .select("id")
    .eq("student_user_id", user.userId)
    .eq("status", "pending")
    .maybeSingle();

  if (existingError) {
    console.error("[studies] failed to find pending study application", existingError);
    return { success: false, error: "기존 스터디 신청을 확인하지 못했습니다." };
  }

  if (existingApplication) {
    const { error } = await supabase
      .from("study_applications")
      .update({
        group_id: null,
        message: cleanedMessage,
        requested_at: requestedAt,
        resolved_at: null,
        resolved_by_user_id: null,
      })
      .eq("id", existingApplication.id);

    if (error) {
      console.error("[studies] failed to update study application", error);
      return { success: false, error: "스터디 신청을 갱신하지 못했습니다." };
    }
  } else {
    const { error } = await supabase.from("study_applications").insert({
      student_user_id: user.userId,
      message: cleanedMessage,
      status: "pending",
      requested_at: requestedAt,
    });

    if (error?.code === "23505") {
      const { error: retryError } = await supabase
        .from("study_applications")
        .update({
          group_id: null,
          message: cleanedMessage,
          requested_at: requestedAt,
          resolved_at: null,
          resolved_by_user_id: null,
        })
        .eq("student_user_id", user.userId)
        .eq("status", "pending");

      if (retryError) {
        console.error("[studies] failed to retry study application update", retryError);
        return { success: false, error: "스터디 신청을 저장하지 못했습니다." };
      }
    } else if (error) {
      console.error("[studies] failed to insert study application", error);
      return { success: false, error: "스터디 신청을 저장하지 못했습니다." };
    }
  }

  revalidateStudyApplicationPaths();
  return { success: true, data: { requestedAt } };
}

export async function approveStudyApplication(
  applicationId: string,
  groupId: string
): Promise<ActionResult> {
  const actor = await requireAdminActor();
  if (!actor.success) return actor;

  const parsedApplicationId = uuidSchema.safeParse(applicationId);
  if (!parsedApplicationId.success) {
    return { success: false, error: "신청 ID가 올바르지 않습니다." };
  }

  const parsedGroupId = uuidSchema.safeParse(groupId);
  if (!parsedGroupId.success) {
    return { success: false, error: "스터디 ID가 올바르지 않습니다." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("approve_study_application", {
    p_application_id: parsedApplicationId.data,
    p_group_id: parsedGroupId.data,
    p_resolved_by_user_id: actor.data.userId,
  });

  if (error) {
    return {
      success: false,
      error: getStudyApplicationRpcErrorMessage(error.message, "스터디 신청을 승인하지 못했습니다."),
    };
  }

  revalidateStudyApplicationPaths();
  revalidatePath(`/studies/${parsedGroupId.data}`);
  return { success: true, data: undefined };
}

export async function rejectStudyApplication(applicationId: string): Promise<ActionResult> {
  const actor = await requireAdminActor();
  if (!actor.success) return actor;

  const parsedApplicationId = uuidSchema.safeParse(applicationId);
  if (!parsedApplicationId.success) {
    return { success: false, error: "신청 ID가 올바르지 않습니다." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("reject_study_application", {
    p_application_id: parsedApplicationId.data,
    p_resolved_by_user_id: actor.data.userId,
  });

  if (error) {
    return {
      success: false,
      error: getStudyApplicationRpcErrorMessage(error.message, "스터디 신청을 거절하지 못했습니다."),
    };
  }

  revalidateStudyApplicationPaths();
  return { success: true, data: undefined };
}

function revalidateStudyApplicationPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/studies");
}

function getStudyApplicationRpcErrorMessage(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  return studyApplicationRpcErrorMessages[message.trim()] ?? fallback;
}
