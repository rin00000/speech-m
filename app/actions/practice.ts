"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
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
  const content = formData.get("content") as string;

  if (!category || !type || !difficulty || !title || !content) {
    return { success: false, error: "필수 입력 항목이 누락되었습니다." };
  }

  const length = content.length;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  const { error } = await supabase.from("practice_scripts").insert({
    category,
    type,
    difficulty,
    title,
    description: description || "",
    content,
    length,
  });

  if (error) {
    console.error("Failed to insert script:", error);
    return { success: false, error: "원고 저장에 실패했습니다." };
  }

  revalidatePath("/(admin)/practice", "page");
  return { success: true };
}
