export type JobSource = "mediajob_announcer" | "mediajob_reporter" | "arang" | "custom";
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
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
