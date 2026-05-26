export type DbJson =
  | string
  | number
  | boolean
  | null
  | { [key: string]: DbJson | undefined }
  | DbJson[];

export type JobSource = "mediajob_announcer" | "mediajob_reporter" | "mediajob_intern" | "arang" | "saramin" | "jobkorea" | "custom";
export type JobStatus = "pending" | "approved" | "rejected";
export type StudentUpgradeRequestStatus = "pending" | "approved" | "rejected";

export interface Database {
  public: {
    Tables: {
      job_postings: {
        Row: {
          id: string;
          title: string;
          company: string | null;
          location: string | null;
          source: JobSource;
          source_url: string;
          status: JobStatus;
          deadline: string | null;
          published_at: string | null;
          /** `status === "rejected"`로 확정된 시각. 그 외 상태에서는 null. */
          rejected_at: string | null;
          created_at: string;
          fingerprint: string | null;
          last_seen_at: string | null;
          /** runJobFitBatch 판정 스냅샷(보류 포함). 수동 상태 변경 시 null. */
          ai_fit_snapshot: DbJson | null;
        };
        Insert: {
          id?: string;
          title: string;
          company?: string | null;
          location?: string | null;
          source: JobSource;
          source_url: string;
          status?: JobStatus;
          deadline?: string | null;
          published_at?: string | null;
          rejected_at?: string | null;
          created_at?: string;
          fingerprint?: string | null;
          last_seen_at?: string | null;
          ai_fit_snapshot?: DbJson | null;
        };
        Update: {
          id?: string;
          title?: string;
          company?: string | null;
          location?: string | null;
          source?: JobSource;
          source_url?: string;
          status?: JobStatus;
          deadline?: string | null;
          published_at?: string | null;
          rejected_at?: string | null;
          created_at?: string;
          fingerprint?: string | null;
          last_seen_at?: string | null;
          ai_fit_snapshot?: DbJson | null;
        };
        Relationships: [];
      },
      crawl_blocked_source_urls: {
        Row: {
          source_url: string;
          created_at: string;
          reason: string | null;
        };
        Insert: {
          source_url: string;
          created_at?: string;
          reason?: string | null;
        };
        Update: {
          source_url?: string;
          created_at?: string;
          reason?: string | null;
        };
        Relationships: [];
      },
      user_profiles: {
        Row: {
          email: string;
          role: "admin" | "student" | "guest";
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          email: string;
          role?: "admin" | "student" | "guest";
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          role?: "admin" | "student" | "guest";
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      },
      student_upgrade_requests: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          message: string;
          status: StudentUpgradeRequestStatus;
          requested_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          display_name?: string | null;
          message?: string;
          status?: StudentUpgradeRequestStatus;
          requested_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          message?: string;
          status?: StudentUpgradeRequestStatus;
          requested_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Relationships: [];
      },
    },
    Views: Record<string, never>,
    Functions: {
      approve_student_upgrade_request: {
        Args: { p_request_id: string; p_resolved_by: string };
        Returns: undefined;
      },
      batch_update_job_posting_crawl_meta: {
        Args: { p_rows: DbJson };
        Returns: undefined;
      },
      purge_stale_job_listings: {
        Args: { p_cutoff_iso: string; p_include_published?: boolean };
        Returns: number;
      },
    },
    Enums: Record<string, never>;
  };
}
