"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import {
  MANAGEMENT_CLASS_CAPACITY_MAX,
  MANAGEMENT_CLASS_CAPACITY_MIN,
} from "@/lib/management-classes/constants";
import { parseSeoulDateTimeLocal } from "@/lib/management-classes/format";
import { createAdminClient } from "@/lib/supabase/server";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

const uuidSchema = z.string().uuid();

const classFormSchema = z.object({
  startsAt: z.string().trim().min(1, "관리반 날짜와 시간을 입력하세요."),
  capacity: z.coerce
    .number()
    .int()
    .min(MANAGEMENT_CLASS_CAPACITY_MIN, "정원은 1명 이상이어야 합니다.")
    .max(MANAGEMENT_CLASS_CAPACITY_MAX),
});

const grantFormSchema = z.object({
  studentUserId: z.string().uuid("수강생을 선택하세요."),
  totalCount: z.coerce.number().int().min(1, "쿠폰은 1개 이상 발급해야 합니다.").max(100),
  note: z.string().trim().max(300, "메모는 300자 이하로 입력하세요.").optional(),
});

const managementClassRpcErrorMessages: Record<string, string> = {
  management_class_admin_required: "관리자 권한이 필요합니다.",
  management_class_actor_required: "취소 처리할 계정을 확인할 수 없습니다.",
  management_class_already_applied: "이미 이 관리반에 신청했습니다.",
  management_class_application_not_active: "취소할 활성 신청을 찾을 수 없습니다.",
  management_class_cancel_forbidden: "본인의 신청만 취소할 수 있습니다.",
  management_class_cancel_window_closed: "관리반 시작 1시간 전부터는 직접 취소할 수 없습니다.",
  management_class_coupon_count_invalid: "쿠폰 발급 개수를 확인하세요.",
  management_class_coupon_required: "사용 가능한 관리반 쿠폰이 없습니다.",
  management_class_full: "정원이 모두 찼습니다.",
  management_class_not_found: "관리반을 찾을 수 없습니다.",
  management_class_not_open: "신청 가능한 관리반이 아닙니다.",
  management_class_student_required: "정회원 수강생만 이용할 수 있습니다.",
};

export async function createManagementClass(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireAdminActor();
  if (!actor.success) return actor;

  const parsed = classFormSchema.safeParse({
    startsAt: formData.get("startsAt"),
    capacity: formData.get("capacity"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요." };
  }

  const startsAtIso = parseSeoulDateTimeLocal(parsed.data.startsAt);
  if (!startsAtIso) {
    return { success: false, error: "날짜와 시간 형식을 확인하세요." };
  }
  const startsAtMs = Date.parse(startsAtIso);
  if (!Number.isFinite(startsAtMs) || startsAtMs <= Date.now()) {
    return { success: false, error: "현재 이후의 관리반 시간만 등록할 수 있습니다." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("management_classes")
    .insert({
      starts_at: startsAtIso,
      capacity: parsed.data.capacity,
      created_by_user_id: actor.data.userId,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: "관리반 공지를 등록하지 못했습니다." };

  revalidateManagementClassPaths();
  return { success: true, data: { id: data.id } };
}

export async function grantManagementClassCoupons(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireAdminActor();
  if (!actor.success) return actor;

  const parsed = grantFormSchema.safeParse({
    studentUserId: formData.get("studentUserId"),
    totalCount: formData.get("totalCount"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("grant_management_class_coupons", {
    p_student_user_id: parsed.data.studentUserId,
    p_total_count: parsed.data.totalCount,
    p_granted_by_user_id: actor.data.userId,
    p_note: parsed.data.note ?? "",
  });

  if (error) {
    return {
      success: false,
      error: getManagementClassRpcErrorMessage(error.message, "쿠폰을 발급하지 못했습니다."),
    };
  }

  revalidateManagementClassPaths();
  return { success: true, data: { id: data } };
}

export async function applyToManagementClass(
  classId: string
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireStudentActor();
  if (!actor.success) return actor;

  const classIdParsed = uuidSchema.safeParse(classId);
  if (!classIdParsed.success) return { success: false, error: "관리반 ID가 올바르지 않습니다." };

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("apply_management_class", {
    p_class_id: classIdParsed.data,
    p_student_user_id: actor.data.userId,
  });

  if (error) {
    return {
      success: false,
      error: getManagementClassRpcErrorMessage(error.message, "관리반 신청을 완료하지 못했습니다."),
    };
  }

  revalidateManagementClassPaths();
  return { success: true, data: { id: data } };
}

export async function cancelMyManagementClassApplication(
  applicationId: string
): Promise<ActionResult> {
  const actor = await requireStudentActor();
  if (!actor.success) return actor;

  return cancelManagementClassApplicationByActor({
    applicationId,
    actorUserId: actor.data.userId,
    reason: "student_cancel",
    fallback: "관리반 신청을 취소하지 못했습니다.",
  });
}

export async function cancelManagementClassApplication(
  applicationId: string
): Promise<ActionResult> {
  const actor = await requireAdminActor();
  if (!actor.success) return actor;

  return cancelManagementClassApplicationByActor({
    applicationId,
    actorUserId: actor.data.userId,
    reason: "admin_cancel",
    fallback: "관리반 신청을 취소하지 못했습니다.",
  });
}

export async function cancelManagementClass(classId: string): Promise<ActionResult> {
  const actor = await requireAdminActor();
  if (!actor.success) return actor;

  const classIdParsed = uuidSchema.safeParse(classId);
  if (!classIdParsed.success) return { success: false, error: "관리반 ID가 올바르지 않습니다." };

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("cancel_management_class", {
    p_class_id: classIdParsed.data,
    p_actor_user_id: actor.data.userId,
    p_reason: "class_canceled",
  });

  if (error) {
    return {
      success: false,
      error: getManagementClassRpcErrorMessage(error.message, "관리반을 취소하지 못했습니다."),
    };
  }

  revalidateManagementClassPaths();
  return { success: true, data: undefined };
}

async function cancelManagementClassApplicationByActor({
  applicationId,
  actorUserId,
  reason,
  fallback,
}: {
  applicationId: string;
  actorUserId: string;
  reason: string;
  fallback: string;
}): Promise<ActionResult> {
  const applicationIdParsed = uuidSchema.safeParse(applicationId);
  if (!applicationIdParsed.success) return { success: false, error: "신청 ID가 올바르지 않습니다." };

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("cancel_management_class_application", {
    p_application_id: applicationIdParsed.data,
    p_actor_user_id: actorUserId,
    p_reason: reason,
  });

  if (error) {
    return {
      success: false,
      error: getManagementClassRpcErrorMessage(error.message, fallback),
    };
  }

  revalidateManagementClassPaths();
  return { success: true, data: undefined };
}

async function requireAdminActor(): Promise<ActionResult<{ userId: string }>> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") {
    return { success: false, error: "관리자 권한이 필요합니다." };
  }
  return { success: true, data: { userId: user.userId } };
}

async function requireStudentActor(): Promise<ActionResult<{ userId: string }>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return { success: false, error: "정회원 수강생만 이용할 수 있습니다." };
  }
  return { success: true, data: { userId: user.userId } };
}

function getManagementClassRpcErrorMessage(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  return managementClassRpcErrorMessages[message.trim()] ?? fallback;
}

function revalidateManagementClassPaths() {
  revalidatePath("/management-classes");
  revalidatePath("/dashboard");
}
