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
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: { display_name?: string | null; avatar_url?: string | null };
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
          is_private: boolean;
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
          is_private?: boolean;
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
          is_private?: boolean;
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
          last_sent_at: string | null;
          send_count: number;
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
          /** The first answer's stars or faces; null when it was another style. */
          rating: number | null;
          /** Up to three: the question as asked, its rating style, and the value given. */
          answers: Json | null;
          comment: string | null;
          contact: string | null;
          visitor_hash: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      // What visitors send back (spec 15, 29 and 33). Their visitor hashes aren't readable.
      contact_shares: {
        Row: {
          id: number;
          code_id: string;
          created_at: string;
          name: string;
          phone: string | null;
          email: string | null;
          note: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      coupon_redemptions: {
        Row: { id: number; code_id: string; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      event_rsvps: {
        Row: {
          id: number;
          code_id: string;
          created_at: string;
          name: string;
          email: string;
          guests: number;
          note: string | null;
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
      record_invite_send: { Args: { p_invite: string }; Returns: undefined };
      my_pending_invite: { Args: Record<string, never>; Returns: string | null };
      create_code: {
        Args: { p_code: Json; p_password?: string | null };
        Returns: Database["public"]["Tables"]["qr_codes"]["Row"];
      };
      update_code: {
        Args: {
          p_id: string;
          p_patch: Json;
          p_password?: string | null;
          p_password_action?: string;
        };
        Returns: Database["public"]["Tables"]["qr_codes"]["Row"];
      };
      my_team: {
        Args: Record<string, never>;
        Returns: {
          user_id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          role: "owner" | TeamRole;
          is_me: boolean;
        }[];
      };
      remove_member: {
        Args: { p_member: string; p_keep_codes: boolean };
        Returns: Json;
      };
      recent_scan_counts: {
        Args: { p_owner: string; p_days?: number };
        Returns: { code_id: string; scans: number }[];
      };
      my_workspaces: {
        Args: Record<string, never>;
        Returns: {
          owner_id: string;
          owner_email: string;
          owner_name: string | null;
          role: TeamRole;
          owner_avatar_url: string | null;
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
          avatar_url: string | null;
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
      submit_feedback_answers: {
        Args: {
          p_slug: string;
          p_answers: Json;
          p_comment: string | null;
          p_contact: string | null;
          p_visitor_hash: string;
        };
        Returns: boolean;
      };
      submit_contact_share: {
        Args: {
          p_slug: string;
          p_name: string;
          p_phone: string | null;
          p_email: string | null;
          p_note: string | null;
          p_visitor_hash: string;
        };
        Returns: boolean;
      };
      record_coupon_use: {
        Args: { p_slug: string; p_phone_hash: string; p_visitor_hash: string };
        /** "used", "already", "limited" or "closed". */
        Returns: string;
      };
      submit_rsvp: {
        Args: {
          p_slug: string;
          p_name: string;
          p_email: string;
          p_guests: number;
          p_note: string | null;
          p_visitor_hash: string;
        };
        /** "listed", "already", "full", "limited", "invalid" or "closed". */
        Returns: string;
      };
      rsvp_places_left: { Args: { p_slug: string }; Returns: number | null };
      rsvp_guests: { Args: { p_code: string }; Returns: number };
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
export type ContactShareRow = Database["public"]["Tables"]["contact_shares"]["Row"];
export type CouponUseRow = Database["public"]["Tables"]["coupon_redemptions"]["Row"];
export type RsvpRow = Database["public"]["Tables"]["event_rsvps"]["Row"];
export type FolderRow = Database["public"]["Tables"]["folders"]["Row"];
export type ApiKeyRow = Database["public"]["Tables"]["api_keys"]["Row"];
export type TeamInviteRow = Database["public"]["Tables"]["team_invites"]["Row"];
