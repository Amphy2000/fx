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
      achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_feedback: {
        Row: {
          analysis_result: string
          created_at: string
          feedback: boolean
          id: string
          trade_setup: Json
          user_id: string
        }
        Insert: {
          analysis_result: string
          created_at?: string
          feedback: boolean
          id?: string
          trade_setup: Json
          user_id: string
        }
        Update: {
          analysis_result?: string
          created_at?: string
          feedback?: boolean
          id?: string
          trade_setup?: Json
          user_id?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          check_in_date: string
          confidence: number
          created_at: string
          focus_level: number
          id: string
          mood: string
          note: string | null
          sleep_hours: number
          stress: number
          updated_at: string
          user_id: string
        }
        Insert: {
          check_in_date?: string
          confidence: number
          created_at?: string
          focus_level: number
          id?: string
          mood: string
          note?: string | null
          sleep_hours: number
          stress: number
          updated_at?: string
          user_id: string
        }
        Update: {
          check_in_date?: string
          confidence?: number
          created_at?: string
          focus_level?: number
          id?: string
          mood?: string
          note?: string | null
          sleep_hours?: number
          stress?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string | null
          rating: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          rating: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          rating?: number
          user_id?: string
        }
        Relationships: []
      }
      leaderboard_profiles: {
        Row: {
          best_pair: string | null
          created_at: string
          display_name: string
          id: string
          is_public: boolean
          profit_factor: number
          total_trades: number
          trading_since: string | null
          updated_at: string
          user_id: string
          win_rate: number
        }
        Insert: {
          best_pair?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_public?: boolean
          profit_factor?: number
          total_trades?: number
          trading_since?: string | null
          updated_at?: string
          user_id: string
          win_rate?: number
        }
        Update: {
          best_pair?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_public?: boolean
          profit_factor?: number
          total_trades?: number
          trading_since?: string | null
          updated_at?: string
          user_id?: string
          win_rate?: number
        }
        Relationships: []
      }
      mt5_connections: {
        Row: {
          account_number: string
          broker_name: string
          created_at: string
          id: string
          investor_password_encrypted: string | null
          is_active: boolean
          last_sync_at: string | null
          server_name: string
          sync_error: string | null
          sync_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number: string
          broker_name: string
          created_at?: string
          id?: string
          investor_password_encrypted?: string | null
          is_active?: boolean
          last_sync_at?: string | null
          server_name: string
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string
          broker_name?: string
          created_at?: string
          id?: string
          investor_password_encrypted?: string | null
          is_active?: boolean
          last_sync_at?: string | null
          server_name?: string
          sync_error?: string | null
          sync_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_credits: number | null
          consent_date: string | null
          created_at: string | null
          credits_reset_date: string | null
          current_streak: number | null
          data_collection_consent: boolean | null
          email: string | null
          full_name: string | null
          id: string
          last_trade_date: string | null
          longest_streak: number | null
          monthly_trade_limit: number | null
          subscription_expires_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          telegram_chat_id: string | null
          telegram_notifications_enabled: boolean | null
          theme: string | null
          trades_count: number | null
          updated_at: string | null
        }
        Insert: {
          ai_credits?: number | null
          consent_date?: string | null
          created_at?: string | null
          credits_reset_date?: string | null
          current_streak?: number | null
          data_collection_consent?: boolean | null
          email?: string | null
          full_name?: string | null
          id: string
          last_trade_date?: string | null
          longest_streak?: number | null
          monthly_trade_limit?: number | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          telegram_chat_id?: string | null
          telegram_notifications_enabled?: boolean | null
          theme?: string | null
          trades_count?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_credits?: number | null
          consent_date?: string | null
          created_at?: string | null
          credits_reset_date?: string | null
          current_streak?: number | null
          data_collection_consent?: boolean | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_trade_date?: string | null
          longest_streak?: number | null
          monthly_trade_limit?: number | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          telegram_chat_id?: string | null
          telegram_notifications_enabled?: boolean | null
          theme?: string | null
          trades_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      routine_entries: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          key_levels: Json | null
          market_bias: string | null
          pre_session_ready: boolean | null
          session_notes: string | null
          trading_rules_checked: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_date?: string
          id?: string
          key_levels?: Json | null
          market_bias?: string | null
          pre_session_ready?: boolean | null
          session_notes?: string | null
          trading_rules_checked?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          key_levels?: Json | null
          market_bias?: string | null
          pre_session_ready?: boolean | null
          session_notes?: string | null
          trading_rules_checked?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      setups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          keywords: string[] | null
          name: string
          rules: string
          screenshot_url: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[] | null
          name: string
          rules: string
          screenshot_url?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string[] | null
          name?: string
          rules?: string
          screenshot_url?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      streaks: {
        Row: {
          best_count: number
          created_at: string
          current_count: number
          id: string
          last_updated: string
          streak_type: string
          user_id: string
        }
        Insert: {
          best_count?: number
          created_at?: string
          current_count?: number
          id?: string
          last_updated?: string
          streak_type: string
          user_id: string
        }
        Update: {
          best_count?: number
          created_at?: string
          current_count?: number
          id?: string
          last_updated?: string
          streak_type?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number | null
          created_at: string
          expires_at: string | null
          id: string
          payment_reference: string | null
          plan_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_reference?: string | null
          plan_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_reference?: string | null
          plan_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      targets: {
        Row: {
          created_at: string
          current_value: number
          description: string | null
          end_date: string
          id: string
          start_date: string
          target_type: string
          target_value: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          description?: string | null
          end_date: string
          id?: string
          start_date: string
          target_type: string
          target_value: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number
          description?: string | null
          end_date?: string
          id?: string
          start_date?: string
          target_type?: string
          target_value?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_insights: {
        Row: {
          ai_summary: string | null
          behavior_comment: string | null
          behavior_label: string | null
          confidence_score: number | null
          created_at: string
          execution_grade: string | null
          id: string
          pattern_type: string | null
          recommendations: string | null
          trade_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          behavior_comment?: string | null
          behavior_label?: string | null
          confidence_score?: number | null
          created_at?: string
          execution_grade?: string | null
          id?: string
          pattern_type?: string | null
          recommendations?: string | null
          trade_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          behavior_comment?: string | null
          behavior_label?: string | null
          confidence_score?: number | null
          created_at?: string
          execution_grade?: string | null
          id?: string
          pattern_type?: string | null
          recommendations?: string | null
          trade_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_insights_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: true
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_screenshots: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          id: string
          storage_path: string
          trade_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          id?: string
          storage_path: string
          trade_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          id?: string
          storage_path?: string
          trade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_screenshots_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          created_at: string | null
          direction: string
          emotion_after: string | null
          emotion_before: string | null
          entry_price: number
          exit_price: number | null
          id: string
          notes: string | null
          pair: string
          profit_loss: number | null
          result: string | null
          screenshot_url: string | null
          setup_id: string | null
          stop_loss: number | null
          take_profit: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          direction: string
          emotion_after?: string | null
          emotion_before?: string | null
          entry_price: number
          exit_price?: number | null
          id?: string
          notes?: string | null
          pair: string
          profit_loss?: number | null
          result?: string | null
          screenshot_url?: string | null
          setup_id?: string | null
          stop_loss?: number | null
          take_profit?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          direction?: string
          emotion_after?: string | null
          emotion_before?: string | null
          entry_price?: number
          exit_price?: number | null
          id?: string
          notes?: string | null
          pair?: string
          profit_loss?: number | null
          result?: string | null
          screenshot_url?: string | null
          setup_id?: string | null
          stop_loss?: number | null
          take_profit?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "setups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      reset_monthly_credits: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
