"use server";

/**
 * /practice 라우트 전용 원고 관리 Server Actions.
 * 관리자 권한 확인 후 연습 원고 생성·수정·삭제와 라우트 재검증을 수행한다.
 */

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import type { PracticeScriptCategory, PracticeScriptDifficulty } from "@/types/database.types";

const PRACTICE_SCRIPT_CATEGORIES: PracticeScriptCategory[] = ["practice", "portfolio", "designated"];
const PRACTICE_SCRIPT_DIFFICULTIES: PracticeScriptDifficulty[] = ["쉬움", "보통", "어려움"];

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
  if (!isPracticeScriptCategory(category) || !isPracticeScriptDifficulty(difficulty)) {
    return { success: false, error: "원고 분류 또는 난이도가 올바르지 않습니다." };
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
  if (!isPracticeScriptCategory(category) || !isPracticeScriptDifficulty(difficulty)) {
    return { success: false, error: "원고 분류 또는 난이도가 올바르지 않습니다." };
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

function isPracticeScriptCategory(value: string): value is PracticeScriptCategory {
  return PRACTICE_SCRIPT_CATEGORIES.includes(value as PracticeScriptCategory);
}

function isPracticeScriptDifficulty(value: string): value is PracticeScriptDifficulty {
  return PRACTICE_SCRIPT_DIFFICULTIES.includes(value as PracticeScriptDifficulty);
}
