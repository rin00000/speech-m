import { z } from "zod";
import type { DbJson } from "@/types/database.types";
import type { JobFitDecision } from "./schema";

/** Stored JSON keys use snake_case for DB clarity. */
export const aiFitSnapshotStoredSchema = z.object({
  label: z.enum(["approved", "rejected"]),
  score: z.number(),
  reasons: z.array(z.string()),
  matched_rules: z.array(z.string()),
  model: z.string(),
  prompt_version: z.string(),
  final_status: z.enum(["approved", "rejected", "pending"]),
  evaluated_at: z.string(),
});

export type AiFitSnapshotStored = z.infer<typeof aiFitSnapshotStoredSchema>;

export const buildAiFitSnapshotPayload = (decision: JobFitDecision): AiFitSnapshotStored => ({
  label: decision.label,
  score: decision.score,
  reasons: decision.reasons,
  matched_rules: decision.matched_rules,
  model: decision.model,
  prompt_version: decision.promptVersion,
  final_status: decision.finalStatus,
  evaluated_at: new Date().toISOString(),
});

export const parseAiFitSnapshot = (raw: DbJson | null | undefined): AiFitSnapshotStored | null => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const parsed = aiFitSnapshotStoredSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
};
