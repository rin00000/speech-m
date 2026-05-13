export type JobSource = "mediajob_announcer" | "mediajob_reporter" | "mediajob_intern" | "arang" | "saramin" | "jobkorea" | "custom";
export type JobStatus = "pending" | "approved" | "rejected";

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
        };
      };
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
      };
      user_profiles: {
        Row: {
          email: string;
          role: "admin" | "student";
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          email: string;
          role?: "admin" | "student";
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          role?: "admin" | "student";
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
