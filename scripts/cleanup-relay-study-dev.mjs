import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ENV_PATH = resolve(process.cwd(), ".env.local");
const RELAY_GROUP_TITLE = "Relay Study Dev";
const SEEDED_USER_IDS = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
  "00000000-0000-4000-8000-000000000004",
  "00000000-0000-4000-8000-000000000005",
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
    throw new Error(".env.local must include NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  assertLocalSupabaseUrl(url);

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await cleanupRelayStudy(supabase);
  await cleanupSeededUsers(supabase);

  console.info("Relay study dev cleanup complete.");
}

async function cleanupRelayStudy(supabase) {
  const { data: groups, error: groupError } = await supabase
    .from("study_groups")
    .select("id")
    .eq("type", "relay")
    .eq("title", RELAY_GROUP_TITLE);

  if (groupError) throw new Error(`study_groups lookup failed: ${groupError.message}`);

  const groupIds = (groups ?? []).map((group) => group.id);
  if (groupIds.length === 0) return;

  const { data: quests, error: questError } = await supabase
    .from("study_quests")
    .select("id")
    .in("group_id", groupIds);

  if (questError) throw new Error(`study_quests lookup failed: ${questError.message}`);

  const questIds = (quests ?? []).map((quest) => quest.id);
  if (questIds.length > 0) {
    const { data: submissions, error: submissionError } = await supabase
      .from("study_relay_submissions")
      .select("audio_path")
      .in("quest_id", questIds)
      .is("audio_deleted_at", null);

    if (submissionError) {
      throw new Error(`study_relay_submissions lookup failed: ${submissionError.message}`);
    }

    const audioPaths = (submissions ?? []).map((submission) => submission.audio_path);
    if (audioPaths.length > 0) {
      const { error: storageError } = await supabase.storage.from("study-audio").remove(audioPaths);

      if (storageError) throw new Error(`study-audio cleanup failed: ${storageError.message}`);
    }
  }

  const { error: deleteGroupError } = await supabase
    .from("study_groups")
    .delete()
    .in("id", groupIds);

  if (deleteGroupError) throw new Error(`study_groups cleanup failed: ${deleteGroupError.message}`);
}

async function cleanupSeededUsers(supabase) {
  const { error } = await supabase.from("users").delete().in("id", SEEDED_USER_IDS);

  if (error) throw new Error(`users cleanup failed: ${error.message}`);
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
      `Refusing to cleanup non-local Supabase project (${url.hostname}). Set ALLOW_REMOTE_SUPABASE_SEED=true to override.`,
    );
  }
}
