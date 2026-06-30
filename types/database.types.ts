export type DbJson =
  | string
  | number
  | boolean
  | null
  | { [key: string]: DbJson | undefined }
  | DbJson[];

export type JobSource = "mediajob_announcer" | "mediajob_reporter" | "mediajob_intern" | "arang" | "saramin" | "jobkorea" | "custom";
export type JobStatus = "pending" | "approved" | "rejected";
export type UserRole = "admin" | "student" | "guest";
export type UserStatus = "active" | "suspended";
export type AuthProvider = "google" | "naver" | "credentials";
export type StudentUpgradeRequestStatus = "pending" | "approved" | "rejected";
export type StudyApplicationStatus = "pending" | "approved" | "rejected";
export type ManagementClassStatus = "open" | "closed" | "canceled";
export type ManagementClassCouponStatus = "available" | "used";
export type ManagementClassApplicationStatus = "active" | "canceled";
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
      users: {
        Row: {
          id: string;
          role: UserRole;
          status: UserStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          role?: UserRole;
          status?: UserStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          status?: UserStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      },
      user_profiles: {
        Row: {
          user_id: string;
          email: string | null;
          display_name: string | null;
          real_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          email?: string | null;
          display_name?: string | null;
          real_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          email?: string | null;
          display_name?: string | null;
          real_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      },
      user_auth_identities: {
        Row: {
          id: string;
          user_id: string;
          provider: AuthProvider;
          provider_account_id: string;
          provider_email: string | null;
          email_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: AuthProvider;
          provider_account_id: string;
          provider_email?: string | null;
          email_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: AuthProvider;
          provider_account_id?: string;
          provider_email?: string | null;
          email_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      },
      user_notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      },
      student_upgrade_requests: {
        Row: {
          id: string;
          user_id: string;
          display_name: string | null;
          message: string;
          status: StudentUpgradeRequestStatus;
          requested_at: string;
          resolved_at: string | null;
          resolved_by_user_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name?: string | null;
          message?: string;
          status?: StudentUpgradeRequestStatus;
          requested_at?: string;
          resolved_at?: string | null;
          resolved_by_user_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string | null;
          message?: string;
          status?: StudentUpgradeRequestStatus;
          requested_at?: string;
          resolved_at?: string | null;
          resolved_by_user_id?: string | null;
        };
        Relationships: [];
      },
      study_applications: {
        Row: {
          id: string;
          student_user_id: string;
          group_id: string | null;
          message: string;
          status: StudyApplicationStatus;
          requested_at: string;
          resolved_at: string | null;
          resolved_by_user_id: string | null;
        };
        Insert: {
          id?: string;
          student_user_id: string;
          group_id?: string | null;
          message?: string;
          status?: StudyApplicationStatus;
          requested_at?: string;
          resolved_at?: string | null;
          resolved_by_user_id?: string | null;
        };
        Update: {
          id?: string;
          student_user_id?: string;
          group_id?: string | null;
          message?: string;
          status?: StudyApplicationStatus;
          requested_at?: string;
          resolved_at?: string | null;
          resolved_by_user_id?: string | null;
        };
        Relationships: [];
      },
      management_classes: {
        Row: {
          id: string;
          starts_at: string;
          capacity: number;
          status: ManagementClassStatus;
          created_by_user_id: string | null;
          canceled_at: string | null;
          canceled_by_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          starts_at: string;
          capacity: number;
          status?: ManagementClassStatus;
          created_by_user_id?: string | null;
          canceled_at?: string | null;
          canceled_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          starts_at?: string;
          capacity?: number;
          status?: ManagementClassStatus;
          created_by_user_id?: string | null;
          canceled_at?: string | null;
          canceled_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      },
      management_class_coupon_grants: {
        Row: {
          id: string;
          student_user_id: string;
          total_count: number;
          granted_by_user_id: string | null;
          note: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_user_id: string;
          total_count: number;
          granted_by_user_id?: string | null;
          note?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_user_id?: string;
          total_count?: number;
          granted_by_user_id?: string | null;
          note?: string;
          created_at?: string;
        };
        Relationships: [];
      },
      management_class_coupons: {
        Row: {
          id: string;
          grant_id: string;
          student_user_id: string;
          sequence_number: number;
          status: ManagementClassCouponStatus;
          used_application_id: string | null;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          grant_id: string;
          student_user_id: string;
          sequence_number: number;
          status?: ManagementClassCouponStatus;
          used_application_id?: string | null;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          grant_id?: string;
          student_user_id?: string;
          sequence_number?: number;
          status?: ManagementClassCouponStatus;
          used_application_id?: string | null;
          used_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      },
      management_class_applications: {
        Row: {
          id: string;
          class_id: string;
          student_user_id: string;
          coupon_id: string;
          status: ManagementClassApplicationStatus;
          applied_at: string;
          canceled_at: string | null;
          canceled_by_user_id: string | null;
          cancel_reason: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          student_user_id: string;
          coupon_id: string;
          status?: ManagementClassApplicationStatus;
          applied_at?: string;
          canceled_at?: string | null;
          canceled_by_user_id?: string | null;
          cancel_reason?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          student_user_id?: string;
          coupon_id?: string;
          status?: ManagementClassApplicationStatus;
          applied_at?: string;
          canceled_at?: string | null;
          canceled_by_user_id?: string | null;
          cancel_reason?: string;
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
          created_by_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type?: StudyGroupType;
          title: string;
          description?: string;
          status?: StudyGroupStatus;
          created_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type?: StudyGroupType;
          title?: string;
          description?: string;
          status?: StudyGroupStatus;
          created_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      },
      study_group_members: {
        Row: {
          id: string;
          group_id: string;
          student_user_id: string;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          student_user_id: string;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          student_user_id?: string;
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
          created_by_user_id: string | null;
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
          created_by_user_id?: string | null;
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
          created_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      },
      study_relay_submissions: {
        Row: {
          id: string;
          quest_id: string;
          student_user_id: string;
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
          student_user_id: string;
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
          student_user_id?: string;
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
          feedback_author_user_id: string;
          comment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          feedback_author_user_id: string;
          comment: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          submission_id?: string;
          feedback_author_user_id?: string;
          comment?: string;
          created_at?: string;
        };
        Relationships: [];
      },
    },
    Views: Record<string, never>,
    Functions: {
      approve_student_upgrade_request: {
        Args: { p_request_id: string; p_resolved_by_user_id: string };
        Returns: undefined;
      },
      approve_study_application: {
        Args: {
          p_application_id: string;
          p_group_id: string;
          p_resolved_by_user_id: string;
        };
        Returns: undefined;
      },
      apply_management_class: {
        Args: { p_class_id: string; p_student_user_id: string };
        Returns: string;
      },
      batch_update_job_posting_crawl_meta: {
        Args: { p_rows: DbJson };
        Returns: undefined;
      },
      cancel_management_class: {
        Args: { p_class_id: string; p_actor_user_id: string; p_reason?: string };
        Returns: undefined;
      },
      cancel_management_class_application: {
        Args: { p_application_id: string; p_actor_user_id: string; p_reason?: string };
        Returns: undefined;
      },
      find_or_create_user_by_identity: {
        Args: {
          p_provider: AuthProvider;
          p_provider_account_id: string;
          p_email?: string | null;
          p_name?: string | null;
          p_avatar_url?: string | null;
          p_email_verified?: boolean;
        };
        Returns: {
          user_id: string;
          user_role: UserRole;
          user_status: UserStatus;
          is_new: boolean;
        }[];
      },
      grant_management_class_coupons: {
        Args: {
          p_student_user_id: string;
          p_total_count: number;
          p_granted_by_user_id: string;
          p_note?: string;
        };
        Returns: string;
      },
      reject_study_application: {
        Args: { p_application_id: string; p_resolved_by_user_id: string };
        Returns: undefined;
      },
        purge_stale_job_listings: {
          Args: { p_cutoff_iso: string; p_include_published?: boolean };
          Returns: number;
        },
        replace_study_group_members: {
          Args: { p_group_id: string; p_student_user_ids: string[] };
          Returns: undefined;
        },
        submit_relay_first_submission: {
        Args: {
          p_quest_id: string;
          p_student_user_id: string;
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
          p_student_user_id: string;
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
          p_student_user_id: string;
          p_target_submission_id: string;
          p_comment: string;
        };
        Returns: string;
      },
    },
    Enums: Record<string, never>;
  };
}
