// Database types for supabase/migrations/20261013120000_quickqreate_core.sql.
// Keep in sync with the migration (or regenerate with the Supabase CLI against the project).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type QrStatus = "active" | "paused";
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
        };
        Insert: {
          name: string;
          qr_type: string;
          content?: Json;
          design?: Json;
          is_dynamic?: boolean;
          slug?: string | null;
          destination?: string | null;
          status?: QrStatus;
        };
        Update: {
          name?: string;
          qr_type?: string;
          content?: Json;
          design?: Json;
          slug?: string | null;
          destination?: string | null;
          status?: QrStatus;
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
        Returns: { destination: string; status: QrStatus }[];
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
