"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function addPracticeScript(formData: FormData) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return { success: false, error: "관리자 권한이 필요합니다." };
  }

  const category = formData.get("category") as string;
  const type = formData.get("type") as string;
  const difficulty = formData.get("difficulty") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  let content = formData.get("content") as string;

  if (!category || !type || !difficulty || !title || !content) {
    return { success: false, error: "필수 입력 항목이 누락되었습니다." };
  }

  content = cleanScriptContent(content);

  const supabase = createAdminClient();

  const { error } = await supabase.from("practice_scripts").insert({
    category,
    type,
    difficulty,
    title,
    description: description || "",
    content,
  });

  if (error) {
    console.error("Failed to insert script:", error);
    return { success: false, error: "원고 저장에 실패했습니다." };
  }

  revalidatePath("/(admin)/practice", "page");
  return { success: true };
}

export async function updatePracticeScript(id: string, formData: FormData) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return { success: false, error: "관리자 권한이 필요합니다." };
  }

  const category = formData.get("category") as string;
  const type = formData.get("type") as string;
  const difficulty = formData.get("difficulty") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  let content = formData.get("content") as string;

  if (!category || !type || !difficulty || !title || !content) {
    return { success: false, error: "필수 입력 항목이 누락되었습니다." };
  }

  content = cleanScriptContent(content);

  const supabase = createAdminClient();

  const { error } = await supabase.from("practice_scripts").update({
    category,
    type,
    difficulty,
    title,
    description: description || "",
    content,
  }).eq("id", id);

  if (error) {
    console.error("Failed to update script:", error);
    return { success: false, error: "원고 수정에 실패했습니다." };
  }

  revalidatePath("/(admin)/practice", "page");
  return { success: true };
}

export async function deletePracticeScript(id: string) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return { success: false, error: "관리자 권한이 필요합니다." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("practice_scripts").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete script:", error);
    return { success: false, error: "원고 삭제에 실패했습니다." };
  }

  revalidatePath("/(admin)/practice", "page");
  return { success: true };
}

function cleanScriptContent(rawContent: string) {
  return rawContent
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^[ \t]+|[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

