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
      equity_snapshots: {
        Row: {
          balance: number
          created_at: string | null
          equity: number
          free_margin: number | null
          id: string
          margin_used: number | null
          mt5_account_id: string | null
          snapshot_time: string
          user_id: string
        }
        Insert: {
          balance: number
          created_at?: string | null
          equity: number
          free_margin?: number | null
          id?: string
          margin_used?: number | null
          mt5_account_id?: string | null
          snapshot_time: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          equity?: number
          free_margin?: number | null
          id?: string
          margin_used?: number | null
          mt5_account_id?: string | null
          snapshot_time?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equity_snapshots_mt5_account_id_fkey"
            columns: ["mt5_account_id"]
            isOneToOne: false
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      journal_entries: {
        Row: {
          created_at: string
          energy_level: number | null
          entry_date: string
          goals_for_session: string | null
          id: string
          lessons_learned: string | null
          market_conditions: string | null
          mood: string
          notes: string | null
          tags: string[] | null
          trading_mindset: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          energy_level?: number | null
          entry_date?: string
          goals_for_session?: string | null
          id?: string
          lessons_learned?: string | null
          market_conditions?: string | null
          mood: string
          notes?: string | null
          tags?: string[] | null
          trading_mindset?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          energy_level?: number | null
          entry_date?: string
          goals_for_session?: string | null
          id?: string
          lessons_learned?: string | null
          market_conditions?: string | null
          mood?: string
          notes?: string | null
          tags?: string[] | null
          trading_mindset?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_insights: {
        Row: {
          analysis_period_end: string
          analysis_period_start: string
          confidence_score: number | null
          created_at: string
          emotional_patterns: Json | null
          id: string
          key_insights: string[] | null
          performance_correlation: Json | null
          recommendations: string[] | null
          user_id: string
        }
        Insert: {
          analysis_period_end: string
          analysis_period_start: string
          confidence_score?: number | null
          created_at?: string
          emotional_patterns?: Json | null
          id?: string
          key_insights?: string[] | null
          performance_correlation?: Json | null
          recommendations?: string[] | null
          user_id: string
        }
        Update: {
          analysis_period_end?: string
          analysis_period_start?: string
          confidence_score?: number | null
          created_at?: string
          emotional_patterns?: Json | null
          id?: string
          key_insights?: string[] | null
          performance_correlation?: Json | null
          recommendations?: string[] | null
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
      mt5_accounts: {
        Row: {
          account_name: string | null
          account_number: string
          account_type: string | null
          api_key_encrypted: string | null
          api_secret_encrypted: string | null
          auto_sync_enabled: boolean | null
          broker_name: string
          created_at: string | null
          currency: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          last_sync_status: string | null
          leverage: number | null
          server_name: string
          sync_error: string | null
          sync_interval_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number: string
          account_type?: string | null
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          auto_sync_enabled?: boolean | null
          broker_name: string
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          leverage?: number | null
          server_name: string
          sync_error?: string | null
          sync_interval_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string
          account_type?: string | null
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          auto_sync_enabled?: boolean | null
          broker_name?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          leverage?: number | null
          server_name?: string
          sync_error?: string | null
          sync_interval_minutes?: number | null
          updated_at?: string | null
          user_id?: string
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
      performance_metrics: {
        Row: {
          average_loss: number | null
          average_r: number | null
          average_win: number | null
          balance: number | null
          consecutive_losses: number | null
          consecutive_wins: number | null
          created_at: string | null
          daily_pnl: number | null
          equity: number | null
          expectancy: number | null
          free_margin: number | null
          id: string
          largest_loss: number | null
          largest_win: number | null
          losing_trades: number | null
          margin: number | null
          margin_level: number | null
          max_drawdown: number | null
          max_drawdown_percent: number | null
          metric_date: string
          monthly_pnl: number | null
          mt5_account_id: string | null
          profit_factor: number | null
          sharpe_ratio: number | null
          total_trades: number | null
          user_id: string
          weekly_pnl: number | null
          win_rate: number | null
          winning_trades: number | null
        }
        Insert: {
          average_loss?: number | null
          average_r?: number | null
          average_win?: number | null
          balance?: number | null
          consecutive_losses?: number | null
          consecutive_wins?: number | null
          created_at?: string | null
          daily_pnl?: number | null
          equity?: number | null
          expectancy?: number | null
          free_margin?: number | null
          id?: string
          largest_loss?: number | null
          largest_win?: number | null
          losing_trades?: number | null
          margin?: number | null
          margin_level?: number | null
          max_drawdown?: number | null
          max_drawdown_percent?: number | null
          metric_date: string
          monthly_pnl?: number | null
          mt5_account_id?: string | null
          profit_factor?: number | null
          sharpe_ratio?: number | null
          total_trades?: number | null
          user_id: string
          weekly_pnl?: number | null
          win_rate?: number | null
          winning_trades?: number | null
        }
        Update: {
          average_loss?: number | null
          average_r?: number | null
          average_win?: number | null
          balance?: number | null
          consecutive_losses?: number | null
          consecutive_wins?: number | null
          created_at?: string | null
          daily_pnl?: number | null
          equity?: number | null
          expectancy?: number | null
          free_margin?: number | null
          id?: string
          largest_loss?: number | null
          largest_win?: number | null
          losing_trades?: number | null
          margin?: number | null
          margin_level?: number | null
          max_drawdown?: number | null
          max_drawdown_percent?: number | null
          metric_date?: string
          monthly_pnl?: number | null
          mt5_account_id?: string | null
          profit_factor?: number | null
          sharpe_ratio?: number | null
          total_trades?: number | null
          user_id?: string
          weekly_pnl?: number | null
          win_rate?: number | null
          winning_trades?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_metrics_mt5_account_id_fkey"
            columns: ["mt5_account_id"]
            isOneToOne: false
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
        ]
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
          last_credit_check: string | null
          last_trade_date: string | null
          longest_streak: number | null
          monthly_trade_limit: number | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
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
          last_credit_check?: string | null
          last_trade_date?: string | null
          longest_streak?: number | null
          monthly_trade_limit?: number | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
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
          last_credit_check?: string | null
          last_trade_date?: string | null
          longest_streak?: number | null
          monthly_trade_limit?: number | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
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
      push_notifications: {
        Row: {
          admin_id: string
          body: string
          created_at: string | null
          failed_count: number | null
          id: string
          sent_count: number | null
          status: string | null
          target_users: string[] | null
          title: string
        }
        Insert: {
          admin_id: string
          body: string
          created_at?: string | null
          failed_count?: number | null
          id?: string
          sent_count?: number | null
          status?: string | null
          target_users?: string[] | null
          title: string
        }
        Update: {
          admin_id?: string
          body?: string
          created_at?: string | null
          failed_count?: number | null
          id?: string
          sent_count?: number | null
          status?: string | null
          target_users?: string[] | null
          title?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          device_info: string | null
          endpoint: string
          id: string
          is_active: boolean | null
          p256dh_key: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          device_info?: string | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          p256dh_key: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          device_info?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          p256dh_key?: string
          updated_at?: string | null
          user_id?: string
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
      setup_performance: {
        Row: {
          average_loss: number | null
          average_r: number | null
          average_win: number | null
          created_at: string | null
          id: string
          losing_trades: number | null
          max_consecutive_losses: number | null
          max_consecutive_wins: number | null
          period_end: string
          period_start: string
          profit_factor: number | null
          setup_id: string | null
          setup_name: string
          total_pnl: number | null
          total_trades: number | null
          updated_at: string | null
          user_id: string
          win_rate: number | null
          winning_trades: number | null
        }
        Insert: {
          average_loss?: number | null
          average_r?: number | null
          average_win?: number | null
          created_at?: string | null
          id?: string
          losing_trades?: number | null
          max_consecutive_losses?: number | null
          max_consecutive_wins?: number | null
          period_end: string
          period_start: string
          profit_factor?: number | null
          setup_id?: string | null
          setup_name: string
          total_pnl?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id: string
          win_rate?: number | null
          winning_trades?: number | null
        }
        Update: {
          average_loss?: number | null
          average_r?: number | null
          average_win?: number | null
          created_at?: string | null
          id?: string
          losing_trades?: number | null
          max_consecutive_losses?: number | null
          max_consecutive_wins?: number | null
          period_end?: string
          period_start?: string
          profit_factor?: number | null
          setup_id?: string | null
          setup_name?: string
          total_pnl?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id?: string
          win_rate?: number | null
          winning_trades?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "setup_performance_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "setups"
            referencedColumns: ["id"]
          },
        ]
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
      sync_logs: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          mt5_account_id: string
          started_at: string | null
          status: string
          sync_type: string
          trades_imported: number | null
          trades_updated: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          mt5_account_id: string
          started_at?: string | null
          status: string
          sync_type: string
          trades_imported?: number | null
          trades_updated?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          mt5_account_id?: string
          started_at?: string | null
          status?: string
          sync_type?: string
          trades_imported?: number | null
          trades_updated?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_mt5_account_id_fkey"
            columns: ["mt5_account_id"]
            isOneToOne: false
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      trade_tags: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          tag_name: string
          tag_type: string
          trade_id: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          tag_name: string
          tag_type: string
          trade_id: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          tag_name?: string
          tag_type?: string
          trade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_tags_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          close_time: string | null
          comment: string | null
          commission: number | null
          created_at: string | null
          direction: string
          emotion_after: string | null
          emotion_before: string | null
          entry_price: number
          exit_price: number | null
          id: string
          is_auto_synced: boolean | null
          magic_number: number | null
          mt5_account_id: string | null
          notes: string | null
          open_time: string | null
          pair: string
          profit_loss: number | null
          r_multiple: number | null
          result: string | null
          screenshot_url: string | null
          session: string | null
          setup_id: string | null
          stop_loss: number | null
          swap: number | null
          take_profit: number | null
          ticket_number: string | null
          updated_at: string | null
          user_id: string
          volume: number | null
        }
        Insert: {
          close_time?: string | null
          comment?: string | null
          commission?: number | null
          created_at?: string | null
          direction: string
          emotion_after?: string | null
          emotion_before?: string | null
          entry_price: number
          exit_price?: number | null
          id?: string
          is_auto_synced?: boolean | null
          magic_number?: number | null
          mt5_account_id?: string | null
          notes?: string | null
          open_time?: string | null
          pair: string
          profit_loss?: number | null
          r_multiple?: number | null
          result?: string | null
          screenshot_url?: string | null
          session?: string | null
          setup_id?: string | null
          stop_loss?: number | null
          swap?: number | null
          take_profit?: number | null
          ticket_number?: string | null
          updated_at?: string | null
          user_id: string
          volume?: number | null
        }
        Update: {
          close_time?: string | null
          comment?: string | null
          commission?: number | null
          created_at?: string | null
          direction?: string
          emotion_after?: string | null
          emotion_before?: string | null
          entry_price?: number
          exit_price?: number | null
          id?: string
          is_auto_synced?: boolean | null
          magic_number?: number | null
          mt5_account_id?: string | null
          notes?: string | null
          open_time?: string | null
          pair?: string
          profit_loss?: number | null
          r_multiple?: number | null
          result?: string | null
          screenshot_url?: string | null
          session?: string | null
          setup_id?: string | null
          stop_loss?: number | null
          swap?: number | null
          take_profit?: number | null
          ticket_number?: string | null
          updated_at?: string | null
          user_id?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_mt5_account_id_fkey"
            columns: ["mt5_account_id"]
            isOneToOne: false
            referencedRelation: "mt5_accounts"
            referencedColumns: ["id"]
          },
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
