"use server";

/**
 * 게스트의 수강생 등업 문의 제출과 관리자 승인/반려 처리를 담당합니다.
 * 처리 완료된 stale 요청은 클라이언트가 목록에서 제거할 수 있도록 코드화된 실패로 반환합니다.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/server";

type ActionErrorCode = "already_resolved";

type ActionResult = {
  success: boolean;
  error?: string;
  code?: ActionErrorCode;
  requestedAt?: string;
};

const messageSchema = z
  .string()
  .trim()
  .max(500, "문의 메모는 500자 이하로 입력해주세요.")
  .optional();

const requestIdSchema = z.string().uuid("요청 ID가 올바르지 않습니다.");
const alreadyResolvedMessage = "이미 처리되었거나 존재하지 않는 등업 문의입니다.";

const studentUpgradeRequestRpcErrorMessages: Record<string, string> = {
  student_upgrade_request_admin_required: "관리자만 등업 문의를 승인할 수 있습니다.",
  student_upgrade_request_not_pending: alreadyResolvedMessage,
  student_upgrade_request_user_not_found: "등업 대상 사용자를 찾을 수 없습니다.",
};

export async function submitStudentUpgradeRequest(message?: string): Promise<ActionResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "로그인 후 수강생 등업 문의를 보낼 수 있습니다." };
  }

  if (user.role !== "guest") {
    return { success: false, error: "게스트 계정만 수강생 등업 문의를 보낼 수 있습니다." };
  }

  const parsedMessage = messageSchema.safeParse(message);
  if (!parsedMessage.success) {
    return {
      success: false,
      error: parsedMessage.error.issues[0]?.message ?? "문의 메모가 올바르지 않습니다.",
    };
  }

  const requestedAt = new Date().toISOString();
  const cleanedMessage = parsedMessage.data ?? "";
  const supabase = createAdminClient();

  const { data: existingRequest, error: existingError } = await supabase
    .from("student_upgrade_requests")
    .select("id")
    .eq("user_id", user.userId)
    .eq("status", "pending")
    .maybeSingle();

  if (existingError) {
    console.error("Failed to find pending student upgrade request:", existingError);
    return { success: false, error: "기존 등업 문의를 확인하지 못했습니다." };
  }

  if (existingRequest) {
    const { error } = await supabase
      .from("student_upgrade_requests")
      .update({
        display_name: user.realName ?? user.name,
        message: cleanedMessage,
        requested_at: requestedAt,
        resolved_at: null,
        resolved_by_user_id: null,
      })
      .eq("id", existingRequest.id);

    if (error) {
      console.error("Failed to update student upgrade request:", error);
      return { success: false, error: "등업 문의를 갱신하지 못했습니다." };
    }
  } else {
    const { error } = await supabase.from("student_upgrade_requests").insert({
      user_id: user.userId,
      display_name: user.realName ?? user.name,
      message: cleanedMessage,
      status: "pending",
      requested_at: requestedAt,
    });

    if (error?.code === "23505") {
      const { error: retryError } = await supabase
        .from("student_upgrade_requests")
        .update({
          display_name: user.realName ?? user.name,
          message: cleanedMessage,
          requested_at: requestedAt,
          resolved_at: null,
          resolved_by_user_id: null,
        })
        .eq("user_id", user.userId)
        .eq("status", "pending");

      if (retryError) {
        console.error("Failed to retry student upgrade request update:", retryError);
        return { success: false, error: "등업 문의를 저장하지 못했습니다." };
      }
    } else if (error) {
      console.error("Failed to insert student upgrade request:", error);
      return { success: false, error: "등업 문의를 저장하지 못했습니다." };
    }
  }

  revalidateStudentUpgradePaths();
  return { success: true, requestedAt };
}

export async function approveStudentUpgradeRequest(requestId: string): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "admin") {
    return { success: false, error: "관리자만 등업 문의를 승인할 수 있습니다." };
  }

  const parsedRequestId = requestIdSchema.safeParse(requestId);
  if (!parsedRequestId.success) {
    return {
      success: false,
      error: parsedRequestId.error.issues[0]?.message ?? "요청 ID가 올바르지 않습니다.",
    };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("approve_student_upgrade_request", {
    p_request_id: parsedRequestId.data,
    p_resolved_by_user_id: actor.userId,
  });

  if (error) {
    const rpcMessage = error.message?.trim();
    const code = getStudentUpgradeRequestErrorCode(rpcMessage);
    if (code === "already_resolved") {
      revalidateStudentUpgradePaths();
      return {
        success: false,
        error: getStudentUpgradeRequestRpcErrorMessage(rpcMessage, alreadyResolvedMessage),
        code,
      };
    }

    console.error("Failed to approve student upgrade request:", error);
    return {
      success: false,
      error: getStudentUpgradeRequestRpcErrorMessage(
        rpcMessage,
        "등업 문의를 승인하지 못했습니다."
      ),
    };
  }

  revalidateStudentUpgradePaths();
  return { success: true };
}

export async function rejectStudentUpgradeRequest(requestId: string): Promise<ActionResult> {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "admin") {
    return { success: false, error: "관리자만 등업 문의를 반려할 수 있습니다." };
  }

  const parsedRequestId = requestIdSchema.safeParse(requestId);
  if (!parsedRequestId.success) {
    return {
      success: false,
      error: parsedRequestId.error.issues[0]?.message ?? "요청 ID가 올바르지 않습니다.",
    };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("student_upgrade_requests")
    .update({
      status: "rejected",
      resolved_at: new Date().toISOString(),
      resolved_by_user_id: actor.userId,
    })
    .eq("id", parsedRequestId.data)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to reject student upgrade request:", error);
    return { success: false, error: "등업 문의를 반려하지 못했습니다." };
  }

  if (!data) {
    revalidateStudentUpgradePaths();
    return { success: false, error: alreadyResolvedMessage, code: "already_resolved" };
  }

  revalidateStudentUpgradePaths();
  return { success: true };
}

function revalidateStudentUpgradePaths() {
  revalidatePath("/dashboard");
  revalidatePath("/users");
}

function getStudentUpgradeRequestRpcErrorMessage(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  return studentUpgradeRequestRpcErrorMessages[message] ?? fallback;
}

function getStudentUpgradeRequestErrorCode(message: string | undefined): ActionErrorCode | undefined {
  if (message === "student_upgrade_request_not_pending") return "already_resolved";
  return undefined;
}
