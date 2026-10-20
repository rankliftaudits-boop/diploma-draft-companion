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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      access_codes: {
        Row: {
          batch_label: string | null
          code: string
          code_key: string | null
          created_at: string
          created_by: string | null
          duration_days: number | null
          fixed_until: string | null
          id: string
          note: string | null
          redeem_before: string | null
          redeemed_at: string | null
          redeemed_by: string | null
          revoked: boolean
          sold_at: string | null
        }
        Insert: {
          batch_label?: string | null
          code: string
          code_key?: string | null
          created_at?: string
          created_by?: string | null
          duration_days?: number | null
          fixed_until?: string | null
          id?: string
          note?: string | null
          redeem_before?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          revoked?: boolean
          sold_at?: string | null
        }
        Update: {
          batch_label?: string | null
          code?: string
          code_key?: string | null
          created_at?: string
          created_by?: string | null
          duration_days?: number | null
          fixed_until?: string | null
          id?: string
          note?: string | null
          redeem_before?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          revoked?: boolean
          sold_at?: string | null
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          created_at: string
          id: string
          mode: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          contact_note: string | null
          daily_ai_limit: number
          id: number
          price_text: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          contact_note?: string | null
          daily_ai_limit?: number
          id?: number
          price_text?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          contact_note?: string | null
          daily_ai_limit?: number
          id?: number
          price_text?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          content: string
          created_at: string
          doc_id: string | null
          id: string
          mode: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          doc_id?: string | null
          id?: string
          mode: string
          role: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          doc_id?: string | null
          id?: string
          mode?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "writing_docs"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_versions: {
        Row: {
          content: string
          created_at: string
          doc_id: string
          id: string
          label: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          doc_id: string
          id?: string
          label?: string | null
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          doc_id?: string
          id?: string
          label?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_versions_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "writing_docs"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          created_at: string
          evidence: string | null
          id: string
          kind: string | null
          link: string | null
          standard: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          evidence?: string | null
          id?: string
          kind?: string | null
          link?: string | null
          standard?: string | null
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          evidence?: string | null
          id?: string
          kind?: string | null
          link?: string | null
          standard?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          domain_names: string[] | null
          email: string | null
          full_name: string | null
          gender: string
          grade_m1: number | null
          grade_m2: number | null
          grade_m3: number | null
          id: string
          responsible_use_accepted_at: string | null
          school_context: string | null
          sep: string | null
          specialty: string | null
          track: string | null
          updated_at: string
          voice_sample: string | null
        }
        Insert: {
          created_at?: string
          domain_names?: string[] | null
          email?: string | null
          full_name?: string | null
          gender?: string
          grade_m1?: number | null
          grade_m2?: number | null
          grade_m3?: number | null
          id: string
          responsible_use_accepted_at?: string | null
          school_context?: string | null
          sep?: string | null
          specialty?: string | null
          track?: string | null
          updated_at?: string
          voice_sample?: string | null
        }
        Update: {
          created_at?: string
          domain_names?: string[] | null
          email?: string | null
          full_name?: string | null
          gender?: string
          grade_m1?: number | null
          grade_m2?: number | null
          grade_m3?: number | null
          id?: string
          responsible_use_accepted_at?: string | null
          school_context?: string | null
          sep?: string | null
          specialty?: string | null
          track?: string | null
          updated_at?: string
          voice_sample?: string | null
        }
        Relationships: []
      }
      redeem_attempts: {
        Row: {
          created_at: string
          id: string
          success: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          success: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          success?: boolean
          user_id?: string
        }
        Relationships: []
      }
      reflections: {
        Row: {
          changed: string | null
          context_label: string | null
          created_at: string
          feedback: string | null
          id: string
          impact: string | null
          now_step: string | null
          so: string | null
          title: string
          updated_at: string
          user_id: string
          what: string | null
        }
        Insert: {
          changed?: string | null
          context_label?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          impact?: string | null
          now_step?: string | null
          so?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          what?: string | null
        }
        Update: {
          changed?: string | null
          context_label?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          impact?: string | null
          now_step?: string | null
          so?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          what?: string | null
        }
        Relationships: []
      }
      self_assessments: {
        Row: {
          assessor_level: number | null
          criterion: string
          id: string
          self_level: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assessor_level?: number | null
          criterion: string
          id?: string
          self_level?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          assessor_level?: number | null
          criterion?: string
          id?: string
          self_level?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sep_requirements: {
        Row: {
          created_at: string
          done: boolean
          id: string
          sep: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          sep: string
          text: string
          user_id?: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          sep?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          access_until: string
          suspended: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          access_until: string
          suspended?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          access_until?: string
          suspended?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          done: boolean
          due_date: string | null
          id: string
          kind: string
          lecture: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          kind?: string
          lecture?: string | null
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          kind?: string
          lecture?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      writing_docs: {
        Row: {
          brief: string | null
          content: string | null
          created_at: string
          doc_type: string
          due_date: string | null
          id: string
          module: string | null
          notes: string | null
          title: string
          updated_at: string
          user_id: string
          word_target: number | null
        }
        Insert: {
          brief?: string | null
          content?: string | null
          created_at?: string
          doc_type?: string
          due_date?: string | null
          id?: string
          module?: string | null
          notes?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          word_target?: number | null
        }
        Update: {
          brief?: string | null
          content?: string | null
          created_at?: string
          doc_type?: string
          due_date?: string | null
          id?: string
          module?: string | null
          notes?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          word_target?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      admin_generate_codes: {
        Args: {
          _count: number
          _duration_days: number
          _fixed_until: string
          _label: string
          _note: string
          _redeem_before: string
        }
        Returns: {
          batch_label: string | null
          code: string
          code_key: string | null
          created_at: string
          created_by: string | null
          duration_days: number | null
          fixed_until: string | null
          id: string
          note: string | null
          redeem_before: string | null
          redeemed_at: string | null
          redeemed_by: string | null
          revoked: boolean
          sold_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "access_codes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_first_admin: { Args: never; Returns: boolean }
      has_active_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      redeem_access_code: { Args: { _code: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
