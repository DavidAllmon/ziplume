// Database types for supabase/migrations/20261013120000_quickqreate_core.sql.
// Keep in sync with the migration (or regenerate with the Supabase CLI against the project).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type QrStatus = "active" | "paused";
/** What a scanner gets: status plus the active dates. */
export type CodeState = "active" | "paused" | "scheduled" | "expired";
export type TeamRole = "viewer" | "editor";
export type DeviceType = "mobile" | "tablet" | "desktop" | "other";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; created_at: string };
        Insert: { id: string; display_name?: string | null; created_at?: string };
        Update: { display_name?: string | null };
        Relationships: [];
      };
      qr_codes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          qr_type: string;
          content: Json;
          design: Json;
          is_dynamic: boolean;
          slug: string | null;
          destination: string | null;
          status: QrStatus;
          scan_count: number;
          last_scanned_at: string | null;
          created_at: string;
          updated_at: string;
          folder_id: string | null;
          active_from: string | null;
          active_until: string | null;
          has_password: boolean;
        };
        Insert: {
          user_id?: string;
          name: string;
          qr_type: string;
          content?: Json;
          design?: Json;
          is_dynamic?: boolean;
          slug?: string | null;
          destination?: string | null;
          status?: QrStatus;
          folder_id?: string | null;
          active_from?: string | null;
          active_until?: string | null;
        };
        Update: {
          name?: string;
          qr_type?: string;
          content?: Json;
          design?: Json;
          slug?: string | null;
          destination?: string | null;
          status?: QrStatus;
          folder_id?: string | null;
          active_from?: string | null;
          active_until?: string | null;
        };
        Relationships: [];
      };
      design_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          design: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: { name: string; design: Json };
        Update: { name?: string; design?: Json };
        Relationships: [];
      };
      folders: {
        Row: { id: string; user_id: string; name: string; created_at: string; updated_at: string };
        Insert: { name: string; user_id?: string };
        Update: { name?: string };
        Relationships: [];
      };
      team_members: {
        Row: { owner_id: string; member_id: string; role: TeamRole; created_at: string };
        Insert: never;
        Update: { role?: TeamRole };
        Relationships: [];
      };
      team_invites: {
        Row: {
          id: string;
          owner_id: string;
          email: string;
          role: TeamRole;
          token: string;
          created_at: string;
          expires_at: string;
          accepted_at: string | null;
          accepted_by: string | null;
        };
        Insert: { email: string; role: TeamRole };
        Update: never;
        Relationships: [];
      };
      api_keys: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          prefix: string;
          created_at: string;
          last_used_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      feedback_responses: {
        Row: {
          id: number;
          code_id: string;
          created_at: string;
          rating: number;
          comment: string | null;
          contact: string | null;
          visitor_hash: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      scan_events: {
        Row: {
          id: number;
          code_id: string;
          scanned_at: string;
          visitor_hash: string;
          country: string | null;
          region: string | null;
          city: string | null;
          device_type: DeviceType;
          os: string | null;
          browser: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      record_scan: {
        Args: {
          p_slug: string;
          p_visitor_hash: string;
          p_country?: string | null;
          p_region?: string | null;
          p_city?: string | null;
          p_device_type?: string | null;
          p_os?: string | null;
          p_browser?: string | null;
          p_record?: boolean;
        };
        Returns: {
          destination: string | null;
          status: CodeState;
          qr_type: string;
          content: Json;
          protected: boolean;
        }[];
      };
      protected_page: { Args: { p_slug: string }; Returns: Json };
      check_code_password: { Args: { p_slug: string; p_password: string }; Returns: boolean };
      set_code_password: { Args: { p_code: string; p_password: string }; Returns: undefined };
      invite_details: { Args: { p_token: string }; Returns: Json };
      accept_invite: { Args: { p_token: string }; Returns: string };
      my_workspaces: {
        Args: Record<string, never>;
        Returns: {
          owner_id: string;
          owner_email: string;
          owner_name: string | null;
          role: TeamRole;
        }[];
      };
      team_overview: {
        Args: Record<string, never>;
        Returns: {
          member_id: string;
          email: string;
          name: string | null;
          role: TeamRole;
          created_at: string;
        }[];
      };
      create_api_key: { Args: { p_name: string }; Returns: Json };
      api_key_user: { Args: { p_key: string }; Returns: string | null };
      api_codes: { Args: { p_user: string; p_limit: number; p_offset: number }; Returns: Json };
      api_code: { Args: { p_user: string; p_id: string }; Returns: Json };
      api_create_code: { Args: { p_user: string; p_code: Json }; Returns: Json };
      api_update_code: { Args: { p_user: string; p_id: string; p_patch: Json }; Returns: Json };
      api_delete_code: { Args: { p_user: string; p_id: string }; Returns: boolean };
      api_code_analytics: {
        Args: { p_user: string; p_id: string; p_from: string; p_to: string; p_tz: string };
        Returns: Json;
      };
      public_page: {
        Args: { p_slug: string };
        Returns: Json;
      };
      submit_feedback: {
        Args: {
          p_slug: string;
          p_rating: number;
          p_comment: string | null;
          p_contact: string | null;
          p_visitor_hash: string;
        };
        Returns: boolean;
      };
      code_analytics: {
        Args: { p_code: string; p_from: string; p_to: string; p_tz?: string };
        Returns: Json;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

export type QrCodeRow = Database["public"]["Tables"]["qr_codes"]["Row"];
export type DesignTemplateRow = Database["public"]["Tables"]["design_templates"]["Row"];
export type FeedbackRow = Database["public"]["Tables"]["feedback_responses"]["Row"];
export type FolderRow = Database["public"]["Tables"]["folders"]["Row"];
export type ApiKeyRow = Database["public"]["Tables"]["api_keys"]["Row"];
export type TeamInviteRow = Database["public"]["Tables"]["team_invites"]["Row"];
