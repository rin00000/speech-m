"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Coordinates student upgrade request submission and admin resolution from the dashboard.
 */

type ActionResult = {
  success: boolean;
  error?: string;
  requestedAt?: string;
};

const messageSchema = z
  .string()
  .trim()
  .max(500, "문의 메모는 500자 이하로 입력해주세요.")
  .optional();

const requestIdSchema = z.string().uuid("요청 ID가 올바르지 않습니다.");

export async function submitStudentUpgradeRequest(message?: string): Promise<ActionResult> {
  const user = await getCurrentUser();

  if (!user?.email) {
    return { success: false, error: "로그인 후 수강생 등업 문의를 보낼 수 있습니다." };
  }

  if (user.role !== "guest") {
    return { success: false, error: "게스트 계정만 수강생 등업 문의를 보낼 수 있습니다." };
  }

  const parsedMessage = messageSchema.safeParse(message);
  if (!parsedMessage.success) {
    return { success: false, error: parsedMessage.error.issues[0]?.message ?? "문의 메모가 올바르지 않습니다." };
  }

  const requestedAt = new Date().toISOString();
  const cleanedMessage = parsedMessage.data ?? "";
  const supabase = createAdminClient();

  const { data: existingRequest, error: existingError } = await supabase
    .from("student_upgrade_requests")
    .select("id")
    .eq("email", user.email)
    .eq("status", "pending")
    .maybeSingle();

  if (existingError) {
    console.error("Failed to find pending student upgrade request:", existingError);
    return { success: false, error: "기존 등업 문의를 확인하는 중 오류가 발생했습니다." };
  }

  if (existingRequest) {
    const { error } = await supabase
      .from("student_upgrade_requests")
      .update({
        display_name: user.name,
        message: cleanedMessage,
        requested_at: requestedAt,
        resolved_at: null,
        resolved_by: null,
      })
      .eq("id", existingRequest.id);

    if (error) {
      console.error("Failed to update student upgrade request:", error);
      return { success: false, error: "등업 문의를 갱신하는 중 오류가 발생했습니다." };
    }
  } else {
    const { error } = await supabase.from("student_upgrade_requests").insert({
      email: user.email,
      display_name: user.name,
      message: cleanedMessage,
      status: "pending",
      requested_at: requestedAt,
    });

    if (error?.code === "23505") {
      const { error: retryError } = await supabase
        .from("student_upgrade_requests")
        .update({
          display_name: user.name,
          message: cleanedMessage,
          requested_at: requestedAt,
          resolved_at: null,
          resolved_by: null,
        })
        .eq("email", user.email)
        .eq("status", "pending");

      if (retryError) {
        console.error("Failed to retry student upgrade request update:", retryError);
        return { success: false, error: "등업 문의를 저장하는 중 오류가 발생했습니다." };
      }
    } else if (error) {
      console.error("Failed to insert student upgrade request:", error);
      return { success: false, error: "등업 문의를 저장하는 중 오류가 발생했습니다." };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/users");
  return { success: true, requestedAt };
}

export async function approveStudentUpgradeRequest(requestId: string): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!actor?.email || actor.role !== "admin") {
    return { success: false, error: "권한이 없습니다. 원장 계정만 등업 문의를 승인할 수 있습니다." };
  }

  const parsedRequestId = requestIdSchema.safeParse(requestId);
  if (!parsedRequestId.success) {
    return { success: false, error: parsedRequestId.error.issues[0]?.message ?? "요청 ID가 올바르지 않습니다." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("approve_student_upgrade_request", {
    p_request_id: parsedRequestId.data,
    p_resolved_by: actor.email,
  });

  if (error) {
    console.error("Failed to approve student upgrade request:", error);
    return { success: false, error: "등업 문의 승인 중 오류가 발생했습니다." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/users");
  return { success: true };
}

export async function rejectStudentUpgradeRequest(requestId: string): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!actor?.email || actor.role !== "admin") {
    return { success: false, error: "권한이 없습니다. 원장 계정만 등업 문의를 반려할 수 있습니다." };
  }

  const parsedRequestId = requestIdSchema.safeParse(requestId);
  if (!parsedRequestId.success) {
    return { success: false, error: parsedRequestId.error.issues[0]?.message ?? "요청 ID가 올바르지 않습니다." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("student_upgrade_requests")
    .update({
      status: "rejected",
      resolved_at: new Date().toISOString(),
      resolved_by: actor.email,
    })
    .eq("id", parsedRequestId.data)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to reject student upgrade request:", error);
    return { success: false, error: "등업 문의 반려 중 오류가 발생했습니다." };
  }

  if (!data) {
    return { success: false, error: "이미 처리되었거나 존재하지 않는 등업 문의입니다." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
