import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(process.cwd(), ".env.local");

const PERSONAS = [
  {
    id: "admin",
    userId: "00000000-0000-4000-8000-000000000001",
    email: "mock-admin@speech-m.com",
    displayName: "Mock Admin",
    role: "admin",
  },
  {
    id: "student",
    userId: "00000000-0000-4000-8000-000000000002",
    email: "mock-student@speech-m.com",
    displayName: "Mock Student A",
    role: "student",
  },
  {
    id: "student2",
    userId: "00000000-0000-4000-8000-000000000003",
    email: "relay.student2@speech-m.local",
    displayName: "Mock Student B",
    role: "student",
  },
  {
    id: "student3",
    userId: "00000000-0000-4000-8000-000000000004",
    email: "relay.student3@speech-m.local",
    displayName: "Mock Student C",
    role: "student",
  },
  {
    id: "guest",
    userId: "00000000-0000-4000-8000-000000000005",
    email: "relay.guest1@speech-m.local",
    displayName: "Mock Guest",
    role: "guest",
  },
];

const ADMINS = PERSONAS.filter((persona) => persona.role === "admin");
const STUDENTS = PERSONAS.filter((persona) => persona.role === "student");
const GUESTS = PERSONAS.filter((persona) => persona.role === "guest");

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(".env.local must include NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  assertLocalSupabaseUrl(url);

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await seedUsers(supabase);

  const groupId = await ensureRelayStudyGroup(supabase);
  await replaceRelayStudyMembers(supabase, groupId);
  await ensureRelayQuest(supabase, groupId);

  console.info("Relay study dev seed complete.");
  console.info(`Admin: ${ADMINS.map((admin) => admin.email).join(", ")}`);
  console.info(`Students: ${STUDENTS.map((student) => student.email).join(", ")}`);
  console.info(`Guests: ${GUESTS.map((guest) => guest.email).join(", ")}`);
}

async function seedUsers(supabase) {
  const now = new Date().toISOString();

  const { error: usersError } = await supabase.from("users").upsert(
    PERSONAS.map((persona) => ({
      id: persona.userId,
      role: persona.role,
      status: "active",
      updated_at: now,
    })),
    { onConflict: "id" },
  );

  if (usersError) throw new Error(`users seed failed: ${usersError.message}`);

  const { error: profilesError } = await supabase.from("user_profiles").upsert(
    PERSONAS.map((persona) => ({
      user_id: persona.userId,
      email: persona.email,
      display_name: persona.displayName,
      real_name: null,
      updated_at: now,
    })),
    { onConflict: "user_id" },
  );

  if (profilesError) throw new Error(`user_profiles seed failed: ${profilesError.message}`);

  const { error: identitiesError } = await supabase.from("user_auth_identities").upsert(
    PERSONAS.map((persona) => ({
      user_id: persona.userId,
      provider: "credentials",
      provider_account_id: `dev:${persona.id}`,
      provider_email: persona.email,
      email_verified: true,
      updated_at: now,
    })),
    { onConflict: "provider,provider_account_id" },
  );

  if (identitiesError) {
    throw new Error(`user_auth_identities seed failed: ${identitiesError.message}`);
  }
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
      `Refusing to seed non-local Supabase project (${url.hostname}). Set ALLOW_REMOTE_SUPABASE_SEED=true to override.`,
    );
  }
}

async function ensureRelayStudyGroup(supabase) {
  const title = "Relay Study Dev";
  const { data: existing, error: selectError } = await supabase
    .from("study_groups")
    .select("id")
    .eq("type", "relay")
    .eq("title", title)
    .maybeSingle();

  if (selectError) throw new Error(`study_groups lookup failed: ${selectError.message}`);
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("study_groups")
    .insert({
      type: "relay",
      title,
      description: "Local relay study seed data.",
      status: "active",
      created_by_user_id: ADMINS[0]?.userId ?? null,
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
      student_user_id: student.userId,
      display_order: index + 1,
    })),
  );

  if (error) throw new Error(`study_group_members seed failed: ${error.message}`);
}

async function ensureRelayQuest(supabase, groupId) {
  const scriptTitle = "Relay Study Dev Script";
  const { data: existing, error: selectError } = await supabase
    .from("study_quests")
    .select("id")
    .eq("group_id", groupId)
    .eq("script_title", scriptTitle)
    .maybeSingle();

  if (selectError) throw new Error(`study_quests lookup failed: ${selectError.message}`);
  if (existing?.id) return;

  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + 7);

  const { error } = await supabase.from("study_quests").insert({
    group_id: groupId,
    script_title: scriptTitle,
    script_content:
      "This is a local relay study script. Submit a voice recording, review the next speaker, and continue the chain.",
    due_at: dueAt.toISOString(),
    status: "open",
    created_by_user_id: ADMINS[0]?.userId ?? null,
  });

  if (error) throw new Error(`study_quests seed failed: ${error.message}`);
}
