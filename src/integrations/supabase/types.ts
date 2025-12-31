export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          avatar: string | null
          created_at: string
          email: string
          id: string
          invitation_expires_at: string | null
          invitation_status: string | null
          invitation_token: string | null
          invited_by: string | null
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          email: string
          id?: string
          invitation_expires_at?: string | null
          invitation_status?: string | null
          invitation_token?: string | null
          invited_by?: string | null
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar?: string | null
          created_at?: string
          email?: string
          id?: string
          invitation_expires_at?: string | null
          invitation_status?: string | null
          invitation_token?: string | null
          invited_by?: string | null
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          assigned_agent_id: string | null
          created_at: string
          id: string
          is_test: boolean
          property_id: string
          status: string
          updated_at: string
          visitor_id: string
        }
        Insert: {
          assigned_agent_id?: string | null
          created_at?: string
          id?: string
          is_test?: boolean
          property_id: string
          status?: string
          updated_at?: string
          visitor_id: string
        }
        Update: {
          assigned_agent_id?: string | null
          created_at?: string
          id?: string
          is_test?: boolean
          property_id?: string
          status?: string
          updated_at?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
          sender_type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      page_analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          page_title: string | null
          property_id: string
          url: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          page_title?: string | null
          property_id: string
          url: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          page_title?: string | null
          property_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_analytics_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          ai_response_delay_max_ms: number | null
          ai_response_delay_min_ms: number | null
          auto_escalation_enabled: boolean | null
          created_at: string
          domain: string
          escalation_keywords: string[] | null
          greeting: string | null
          id: string
          max_ai_messages_before_escalation: number | null
          name: string
          offline_message: string | null
          proactive_message: string | null
          proactive_message_delay_seconds: number | null
          proactive_message_enabled: boolean | null
          require_email_before_chat: boolean | null
          require_name_before_chat: boolean | null
          typing_indicator_max_ms: number | null
          typing_indicator_min_ms: number | null
          updated_at: string
          user_id: string
          widget_color: string | null
        }
        Insert: {
          ai_response_delay_max_ms?: number | null
          ai_response_delay_min_ms?: number | null
          auto_escalation_enabled?: boolean | null
          created_at?: string
          domain: string
          escalation_keywords?: string[] | null
          greeting?: string | null
          id?: string
          max_ai_messages_before_escalation?: number | null
          name: string
          offline_message?: string | null
          proactive_message?: string | null
          proactive_message_delay_seconds?: number | null
          proactive_message_enabled?: boolean | null
          require_email_before_chat?: boolean | null
          require_name_before_chat?: boolean | null
          typing_indicator_max_ms?: number | null
          typing_indicator_min_ms?: number | null
          updated_at?: string
          user_id: string
          widget_color?: string | null
        }
        Update: {
          ai_response_delay_max_ms?: number | null
          ai_response_delay_min_ms?: number | null
          auto_escalation_enabled?: boolean | null
          created_at?: string
          domain?: string
          escalation_keywords?: string[] | null
          greeting?: string | null
          id?: string
          max_ai_messages_before_escalation?: number | null
          name?: string
          offline_message?: string | null
          proactive_message?: string | null
          proactive_message_delay_seconds?: number | null
          proactive_message_enabled?: boolean | null
          require_email_before_chat?: boolean | null
          require_name_before_chat?: boolean | null
          typing_indicator_max_ms?: number | null
          typing_indicator_min_ms?: number | null
          updated_at?: string
          user_id?: string
          widget_color?: string | null
        }
        Relationships: []
      }
      property_agents: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          property_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          property_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_agents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      salesforce_exports: {
        Row: {
          conversation_id: string
          export_type: string
          exported_at: string
          exported_by: string | null
          id: string
          salesforce_lead_id: string
        }
        Insert: {
          conversation_id: string
          export_type?: string
          exported_at?: string
          exported_by?: string | null
          id?: string
          salesforce_lead_id: string
        }
        Update: {
          conversation_id?: string
          export_type?: string
          exported_at?: string
          exported_by?: string | null
          id?: string
          salesforce_lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salesforce_exports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      salesforce_settings: {
        Row: {
          access_token: string | null
          auto_export_on_conversation_end: boolean
          auto_export_on_escalation: boolean
          client_id: string | null
          client_secret: string | null
          created_at: string
          enabled: boolean
          field_mappings: Json
          id: string
          instance_url: string | null
          property_id: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          auto_export_on_conversation_end?: boolean
          auto_export_on_escalation?: boolean
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          enabled?: boolean
          field_mappings?: Json
          id?: string
          instance_url?: string | null
          property_id: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          auto_export_on_conversation_end?: boolean
          auto_export_on_escalation?: boolean
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          enabled?: boolean
          field_mappings?: Json
          id?: string
          instance_url?: string | null
          property_id?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salesforce_settings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visitors: {
        Row: {
          age: string | null
          browser_info: string | null
          created_at: string
          current_page: string | null
          email: string | null
          id: string
          location: string | null
          name: string | null
          occupation: string | null
          phone: string | null
          property_id: string
          session_id: string
        }
        Insert: {
          age?: string | null
          browser_info?: string | null
          created_at?: string
          current_page?: string | null
          email?: string | null
          id?: string
          location?: string | null
          name?: string | null
          occupation?: string | null
          phone?: string | null
          property_id: string
          session_id: string
        }
        Update: {
          age?: string | null
          browser_info?: string | null
          created_at?: string
          current_page?: string | null
          email?: string | null
          id?: string
          location?: string | null
          name?: string | null
          occupation?: string | null
          phone?: string | null
          property_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitors_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "client" | "agent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "client", "agent"],
    },
  },
} as const
