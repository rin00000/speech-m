import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(process.cwd(), ".env.local");
const STUDENTS = [
  { email: "mock-student@speech-m.com", display_name: "모의 수강생", role: "student" },
  { email: "relay.student2@speech-m.local", display_name: "이지민 준비생", role: "student" },
  { email: "relay.student3@speech-m.local", display_name: "박찬우 준비생", role: "student" },
];
const GUESTS = [
  { email: "relay.guest1@speech-m.local", display_name: "정다은 게스트", role: "guest" },
  { email: "relay.guest2@speech-m.local", display_name: "최윤서 게스트", role: "guest" },
];
const ADMINS = [
  { email: "mock-admin@speech-m.com", display_name: "모의 원장님", role: "admin" },
];

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(".env.local에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
  }

  assertLocalSupabaseUrl(url);

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const profiles = [...ADMINS, ...STUDENTS, ...GUESTS];
  const { error: profileError } = await supabase
    .from("user_profiles")
    .upsert(
      profiles.map((profile) => ({
        ...profile,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "email" },
    );

  if (profileError) throw new Error(`user_profiles seed failed: ${profileError.message}`);

  const groupId = await ensureRelayStudyGroup(supabase);
  await replaceRelayStudyMembers(supabase, groupId);
  await ensureRelayQuest(supabase, groupId);

  console.info("Relay study dev seed complete.");
  console.info(`Admin: ${ADMINS.map((admin) => admin.email).join(", ")}`);
  console.info(`Students: ${STUDENTS.map((student) => student.email).join(", ")}`);
  console.info(`Guests: ${GUESTS.map((guest) => guest.email).join(", ")}`);
}

function loadEnvLocal() {
  if (!existsSync(ENV_PATH)) return {};

  return Object.fromEntries(
    readFileSync(ENV_PATH, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index);
        const rawValue = line.slice(index + 1).trim();
        const value = rawValue.replace(/^['"]|['"]$/g, "");
        return [key, value];
      }),
  );
}

function assertLocalSupabaseUrl(rawUrl) {
  const url = new URL(rawUrl);
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  const allowRemote = process.env.ALLOW_REMOTE_SUPABASE_SEED === "true";

  if (!isLocalHost && !allowRemote) {
    throw new Error(
      `Refusing to seed non-local Supabase project (${url.hostname}). 원격 테스트가 필요하면 ALLOW_REMOTE_SUPABASE_SEED=true를 명시하세요.`,
    );
  }
}

async function ensureRelayStudyGroup(supabase) {
  const { data: existing, error: selectError } = await supabase
    .from("study_groups")
    .select("id")
    .eq("type", "relay")
    .eq("title", "릴레이 스터디")
    .maybeSingle();

  if (selectError) throw new Error(`study_groups lookup failed: ${selectError.message}`);
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("study_groups")
    .insert({
      type: "relay",
      title: "릴레이 스터디",
      description: "로컬 확인용 릴레이 스터디입니다.",
      status: "active",
    })
    .select("id")
    .single();

  if (error) throw new Error(`study_groups seed failed: ${error.message}`);
  return data.id;
}

async function replaceRelayStudyMembers(supabase, groupId) {
  const { error: deleteError } = await supabase
    .from("study_group_members")
    .delete()
    .eq("group_id", groupId);

  if (deleteError) throw new Error(`study_group_members cleanup failed: ${deleteError.message}`);

  const { error } = await supabase.from("study_group_members").insert(
    STUDENTS.map((student, index) => ({
      group_id: groupId,
      student_email: student.email,
      display_order: index + 1,
    })),
  );

  if (error) throw new Error(`study_group_members seed failed: ${error.message}`);
}

async function ensureRelayQuest(supabase, groupId) {
  const { data: existing, error: selectError } = await supabase
    .from("study_quests")
    .select("id")
    .eq("group_id", groupId)
    .eq("script_title", "로컬 확인용 릴레이 원고")
    .maybeSingle();

  if (selectError) throw new Error(`study_quests lookup failed: ${selectError.message}`);
  if (existing?.id) return;

  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + 7);

  const { error } = await supabase.from("study_quests").insert({
    group_id: groupId,
    script_title: "로컬 확인용 릴레이 원고",
    script_content:
      "오늘의 주요 뉴스입니다.\n\nSpeech-M 릴레이 스터디는 한 명의 음성 제출에서 시작해, 다음 학생의 피드백과 음성 제출로 이어지는 방식입니다.\n\n정확한 발음과 안정적인 호흡, 문장 끝 처리에 집중해 녹음해 주세요.",
    due_at: dueAt.toISOString(),
    status: "open",
  });

  if (error) throw new Error(`study_quests seed failed: ${error.message}`);
}
