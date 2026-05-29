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
export type PracticeScriptCategory = "practice" | "portfolio" | "designated";
export type PracticeScriptDifficulty = "쉬움" | "보통" | "어려움";
export type StudyGroupType = "relay";
export type StudyGroupStatus = "active" | "archived";
export type StudyQuestStatus = "open" | "closed";

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
          detail_verified_at: string | null;
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
          detail_verified_at?: string | null;
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
          detail_verified_at?: string | null;
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
      practice_scripts: {
        Row: {
          id: string;
          title: string;
          content: string;
          category: PracticeScriptCategory;
          type: string;
          difficulty: PracticeScriptDifficulty;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          category: PracticeScriptCategory;
          type?: string;
          difficulty?: PracticeScriptDifficulty;
          description?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          category?: PracticeScriptCategory;
          type?: string;
          difficulty?: PracticeScriptDifficulty;
          description?: string;
          created_at?: string;
        };
        Relationships: [];
      },
      system_settings: {
        Row: {
          key: string;
          value: DbJson;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: DbJson;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: DbJson;
          updated_at?: string;
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
      study_groups: {
        Row: {
          id: string;
          type: StudyGroupType;
          title: string;
          description: string;
          status: StudyGroupStatus;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type?: StudyGroupType;
          title: string;
          description?: string;
          status?: StudyGroupStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: StudyGroupType;
          title?: string;
          description?: string;
          status?: StudyGroupStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      },
      study_group_members: {
        Row: {
          id: string;
          group_id: string;
          student_email: string;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          student_email: string;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          student_email?: string;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [];
      },
      study_quests: {
        Row: {
          id: string;
          group_id: string;
          script_title: string;
          script_content: string;
          due_at: string;
          status: StudyQuestStatus;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          script_title: string;
          script_content: string;
          due_at: string;
          status?: StudyQuestStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          script_title?: string;
          script_content?: string;
          due_at?: string;
          status?: StudyQuestStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      },
      study_relay_submissions: {
        Row: {
          id: string;
          quest_id: string;
          student_email: string;
          audio_path: string;
          audio_file_name: string;
          audio_content_type: string;
          audio_size_bytes: number;
          sequence_number: number;
          submitted_at: string;
          audio_deleted_at: string | null;
        };
        Insert: {
          id?: string;
          quest_id: string;
          student_email: string;
          audio_path: string;
          audio_file_name: string;
          audio_content_type: string;
          audio_size_bytes: number;
          sequence_number: number;
          submitted_at?: string;
          audio_deleted_at?: string | null;
        };
        Update: {
          id?: string;
          quest_id?: string;
          student_email?: string;
          audio_path?: string;
          audio_file_name?: string;
          audio_content_type?: string;
          audio_size_bytes?: number;
          sequence_number?: number;
          submitted_at?: string;
          audio_deleted_at?: string | null;
        };
        Relationships: [];
      },
      study_relay_feedback: {
        Row: {
          id: string;
          submission_id: string;
          feedback_author_email: string;
          comment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          feedback_author_email: string;
          comment: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          submission_id?: string;
          feedback_author_email?: string;
          comment?: string;
          created_at?: string;
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
      submit_relay_first_submission: {
        Args: {
          p_quest_id: string;
          p_student_email: string;
          p_audio_path: string;
          p_audio_file_name: string;
          p_audio_content_type: string;
          p_audio_size_bytes: number;
        };
        Returns: string;
      },
      submit_relay_feedback_and_submission: {
        Args: {
          p_quest_id: string;
          p_student_email: string;
          p_target_submission_id: string;
          p_comment: string;
          p_audio_path: string;
          p_audio_file_name: string;
          p_audio_content_type: string;
          p_audio_size_bytes: number;
        };
        Returns: string;
      },
      submit_relay_final_feedback: {
        Args: {
          p_quest_id: string;
          p_student_email: string;
          p_target_submission_id: string;
          p_comment: string;
        };
        Returns: string;
      },
    },
    Enums: Record<string, never>;
  };
}
