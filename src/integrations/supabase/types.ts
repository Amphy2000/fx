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
      abuse_prevention_overrides: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          override_type: string
          override_value: string
          reason: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          override_type: string
          override_value: string
          reason: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          override_type?: string
          override_value?: string
          reason?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      accountability_challenges: {
        Row: {
          challenge_type: string
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string
          goal_criteria: Json
          id: string
          is_public: boolean | null
          max_participants: number | null
          prize_description: string | null
          start_date: string
          title: string
          updated_at: string | null
        }
        Insert: {
          challenge_type: string
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date: string
          goal_criteria: Json
          id?: string
          is_public?: boolean | null
          max_participants?: number | null
          prize_description?: string | null
          start_date: string
          title: string
          updated_at?: string | null
        }
        Update: {
          challenge_type?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string
          goal_criteria?: Json
          id?: string
          is_public?: boolean | null
          max_participants?: number | null
          prize_description?: string | null
          start_date?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accountability_challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accountability_groups: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          group_image_url: string | null
          id: string
          is_public: boolean | null
          max_members: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          group_image_url?: string | null
          id?: string
          is_public?: boolean | null
          max_members?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          group_image_url?: string | null
          id?: string
          is_public?: boolean | null
          max_members?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accountability_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accountability_partnerships: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          ended_at: string | null
          id: string
          initiated_by: string
          partner_id: string
          request_message: string | null
          shared_data_permissions: Json | null
          status: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          initiated_by: string
          partner_id: string
          request_message?: string | null
          shared_data_permissions?: Json | null
          status?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          initiated_by?: string
          partner_id?: string
          request_message?: string | null
          shared_data_permissions?: Json | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountability_partnerships_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accountability_partnerships_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accountability_partnerships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      accountability_profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          experience_level: string | null
          goals: string[] | null
          id: string
          is_seeking_partner: boolean | null
          max_partners: number | null
          notification_preferences: Json | null
          timezone: string | null
          trading_style: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          experience_level?: string | null
          goals?: string[] | null
          id?: string
          is_seeking_partner?: boolean | null
          max_partners?: number | null
          notification_preferences?: Json | null
          timezone?: string | null
          trading_style?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          experience_level?: string | null
          goals?: string[] | null
          id?: string
          is_seeking_partner?: boolean | null
          max_partners?: number | null
          notification_preferences?: Json | null
          timezone?: string | null
          trading_style?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountability_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      campaign_logs: {
        Row: {
          campaign_id: string
          error_message: string | null
          executed_at: string
          execution_time_ms: number | null
          id: string
          notifications_sent: number
          users_matched: number
        }
        Insert: {
          campaign_id: string
          error_message?: string | null
          executed_at?: string
          execution_time_ms?: number | null
          id?: string
          notifications_sent?: number
          users_matched?: number
        }
        Update: {
          campaign_id?: string
          error_message?: string | null
          executed_at?: string
          execution_time_ms?: number | null
          id?: string
          notifications_sent?: number
          users_matched?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "notification_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          completed_at: string | null
          current_progress: Json | null
          group_id: string | null
          id: string
          joined_at: string | null
          rank: number | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          current_progress?: Json | null
          group_id?: string | null
          id?: string
          joined_at?: string | null
          rank?: number | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          current_progress?: Json | null
          group_id?: string | null
          id?: string
          joined_at?: string | null
          rank?: number | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "accountability_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "accountability_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      credit_earnings: {
        Row: {
          created_at: string | null
          credits_earned: number
          description: string | null
          earned_at: string | null
          earning_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credits_earned: number
          description?: string | null
          earned_at?: string | null
          earning_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          credits_earned?: number
          description?: string | null
          earned_at?: string | null
          earning_type?: string
          id?: string
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
      edge_function_rate_limits: {
        Row: {
          created_at: string | null
          function_name: string
          id: string
          request_count: number | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          function_name: string
          id?: string
          request_count?: number | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          function_name?: string
          id?: string
          request_count?: number | null
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      email_ab_assignments: {
        Row: {
          ab_test_id: string
          assigned_at: string | null
          email_send_id: string | null
          id: string
          user_id: string
          variant_id: string
        }
        Insert: {
          ab_test_id: string
          assigned_at?: string | null
          email_send_id?: string | null
          id?: string
          user_id: string
          variant_id: string
        }
        Update: {
          ab_test_id?: string
          assigned_at?: string | null
          email_send_id?: string | null
          id?: string
          user_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_ab_assignments_ab_test_id_fkey"
            columns: ["ab_test_id"]
            isOneToOne: false
            referencedRelation: "email_ab_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_ab_assignments_email_send_id_fkey"
            columns: ["email_send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_ab_assignments_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "email_ab_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_ab_tests: {
        Row: {
          campaign_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          started_at: string | null
          status: string | null
          test_type: string
          updated_at: string | null
          winner_variant_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          started_at?: string | null
          status?: string | null
          test_type: string
          updated_at?: string | null
          winner_variant_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          started_at?: string | null
          status?: string | null
          test_type?: string
          updated_at?: string | null
          winner_variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_ab_tests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_ab_variants: {
        Row: {
          ab_test_id: string
          clicked_count: number | null
          conversion_count: number | null
          created_at: string | null
          delivered_count: number | null
          id: string
          name: string
          opened_count: number | null
          send_time: string | null
          sent_count: number | null
          subject_line: string | null
          template_id: string | null
          traffic_percentage: number | null
          updated_at: string | null
        }
        Insert: {
          ab_test_id: string
          clicked_count?: number | null
          conversion_count?: number | null
          created_at?: string | null
          delivered_count?: number | null
          id?: string
          name: string
          opened_count?: number | null
          send_time?: string | null
          sent_count?: number | null
          subject_line?: string | null
          template_id?: string | null
          traffic_percentage?: number | null
          updated_at?: string | null
        }
        Update: {
          ab_test_id?: string
          clicked_count?: number | null
          conversion_count?: number | null
          created_at?: string | null
          delivered_count?: number | null
          id?: string
          name?: string
          opened_count?: number | null
          send_time?: string | null
          sent_count?: number | null
          subject_line?: string | null
          template_id?: string | null
          traffic_percentage?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_ab_variants_ab_test_id_fkey"
            columns: ["ab_test_id"]
            isOneToOne: false
            referencedRelation: "email_ab_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_ab_variants_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_bounces: {
        Row: {
          bounce_type: string
          bounced_at: string | null
          campaign_id: string | null
          email: string
          id: string
          reason: string | null
        }
        Insert: {
          bounce_type: string
          bounced_at?: string | null
          campaign_id?: string | null
          email: string
          id?: string
          reason?: string | null
        }
        Update: {
          bounce_type?: string
          bounced_at?: string | null
          campaign_id?: string | null
          email?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_bounces_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          ab_test_id: string | null
          bounced_count: number | null
          clicked_count: number | null
          created_at: string
          created_by: string
          delivered_count: number | null
          description: string | null
          failed_count: number | null
          id: string
          list_id: string | null
          name: string
          opened_count: number | null
          scheduled_for: string | null
          sent_at: string | null
          sent_count: number | null
          status: string
          template_id: string | null
          total_recipients: number | null
          updated_at: string
          user_segment: Json
        }
        Insert: {
          ab_test_id?: string | null
          bounced_count?: number | null
          clicked_count?: number | null
          created_at?: string
          created_by: string
          delivered_count?: number | null
          description?: string | null
          failed_count?: number | null
          id?: string
          list_id?: string | null
          name: string
          opened_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string
          user_segment?: Json
        }
        Update: {
          ab_test_id?: string | null
          bounced_count?: number | null
          clicked_count?: number | null
          created_at?: string
          created_by?: string
          delivered_count?: number | null
          description?: string | null
          failed_count?: number | null
          id?: string
          list_id?: string | null
          name?: string
          opened_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          template_id?: string | null
          total_recipients?: number | null
          updated_at?: string
          user_segment?: Json
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_ab_test_id_fkey"
            columns: ["ab_test_id"]
            isOneToOne: false
            referencedRelation: "email_ab_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "email_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_contact_tags: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          tag: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          tag: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "email_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_contacts: {
        Row: {
          created_at: string | null
          custom_fields: Json | null
          email: string
          first_name: string | null
          id: string
          last_activity_at: string | null
          last_name: string | null
          list_id: string
          source: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_fields?: Json | null
          email: string
          first_name?: string | null
          id?: string
          last_activity_at?: string | null
          last_name?: string | null
          list_id: string
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_fields?: Json | null
          email?: string
          first_name?: string | null
          id?: string
          last_activity_at?: string | null
          last_name?: string | null
          list_id?: string
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_contacts_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "email_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      email_content_blocks: {
        Row: {
          block_type: string
          content: Json
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          block_type: string
          content: Json
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          block_type?: string
          content?: Json
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_events: {
        Row: {
          campaign_id: string
          created_at: string
          email_send_id: string
          event_data: Json | null
          event_type: string
          id: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          email_send_id: string
          event_data?: Json | null
          event_type: string
          id?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          email_send_id?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_email_send_id_fkey"
            columns: ["email_send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      email_lists: {
        Row: {
          active_contacts: number | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          total_contacts: number | null
          updated_at: string | null
        }
        Insert: {
          active_contacts?: number | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          total_contacts?: number | null
          updated_at?: string | null
        }
        Update: {
          active_contacts?: number | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          total_contacts?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_personalization_rules: {
        Row: {
          conditions: Json
          content_block_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          rule_type: string
          updated_at: string | null
        }
        Insert: {
          conditions: Json
          content_block_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          rule_type: string
          updated_at?: string | null
        }
        Update: {
          conditions?: Json
          content_block_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          rule_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_personalization_rules_content_block_id_fkey"
            columns: ["content_block_id"]
            isOneToOne: false
            referencedRelation: "email_content_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_tracking: {
        Row: {
          created_at: string | null
          domain: string
          emails_sent: number | null
          id: string
          send_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          emails_sent?: number | null
          id?: string
          send_date?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          emails_sent?: number | null
          id?: string
          send_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_sends: {
        Row: {
          campaign_id: string
          delivered_at: string | null
          email_address: string
          error_message: string | null
          id: string
          metadata: Json | null
          sent_at: string | null
          status: string
          user_id: string
          variant_id: string | null
        }
        Insert: {
          campaign_id: string
          delivered_at?: string | null
          email_address: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          sent_at?: string | null
          status?: string
          user_id: string
          variant_id?: string | null
        }
        Update: {
          campaign_id?: string
          delivered_at?: string | null
          email_address?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          sent_at?: string | null
          status?: string
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "email_ab_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          html_content: string
          id: string
          name: string
          preview_text: string | null
          subject: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          html_content: string
          id?: string
          name: string
          preview_text?: string | null
          subject: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          html_content?: string
          id?: string
          name?: string
          preview_text?: string | null
          subject?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      email_unsubscribes: {
        Row: {
          campaign_id: string | null
          email: string
          id: string
          reason: string | null
          unsubscribed_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          email: string
          id?: string
          reason?: string | null
          unsubscribed_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          email?: string
          id?: string
          reason?: string | null
          unsubscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_unsubscribes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_warm_up_schedules: {
        Row: {
          created_at: string | null
          created_by: string
          current_daily_limit: number
          daily_increment: number
          domain: string
          id: string
          is_active: boolean | null
          last_increment_at: string | null
          started_at: string | null
          target_daily_limit: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          current_daily_limit?: number
          daily_increment?: number
          domain: string
          id?: string
          is_active?: boolean | null
          last_increment_at?: string | null
          started_at?: string | null
          target_daily_limit?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          current_daily_limit?: number
          daily_increment?: number
          domain?: string
          id?: string
          is_active?: boolean | null
          last_increment_at?: string | null
          started_at?: string | null
          target_daily_limit?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      email_workflow_executions: {
        Row: {
          email_send_id: string | null
          error_message: string | null
          executed_at: string | null
          id: string
          status: string | null
          user_id: string
          workflow_id: string
        }
        Insert: {
          email_send_id?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          status?: string | null
          user_id: string
          workflow_id: string
        }
        Update: {
          email_send_id?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          status?: string | null
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_workflow_executions_email_send_id_fkey"
            columns: ["email_send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "email_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      email_workflows: {
        Row: {
          created_at: string | null
          created_by: string
          delay_minutes: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sent_count: number | null
          template_id: string | null
          trigger_conditions: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          delay_minutes?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sent_count?: number | null
          template_id?: string | null
          trigger_conditions?: Json | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          delay_minutes?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sent_count?: number | null
          template_id?: string | null
          trigger_conditions?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_workflows_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
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
      flagged_signups: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          email: string
          flagged_at: string | null
          flagged_reason: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          signup_fingerprint: string | null
          signup_ip_address: string | null
          status: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          email: string
          flagged_at?: string | null
          flagged_reason: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          signup_fingerprint?: string | null
          signup_ip_address?: string | null
          status?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          email?: string
          flagged_at?: string | null
          flagged_reason?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          signup_fingerprint?: string | null
          signup_ip_address?: string | null
          status?: string | null
        }
        Relationships: []
      }
      goal_check_ins: {
        Row: {
          check_in_date: string
          created_at: string
          goal_id: string
          id: string
          notes: string | null
          status: string
          user_id: string
        }
        Insert: {
          check_in_date?: string
          created_at?: string
          goal_id: string
          id?: string
          notes?: string | null
          status: string
          user_id: string
        }
        Update: {
          check_in_date?: string
          created_at?: string
          goal_id?: string
          id?: string
          notes?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_check_ins_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "partner_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_check_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_comments: {
        Row: {
          author_id: string
          check_in_id: string | null
          content: string
          created_at: string | null
          goal_id: string
          id: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id: string
          check_in_id?: string | null
          content: string
          created_at?: string | null
          goal_id: string
          id?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          check_in_id?: string | null
          content?: string
          created_at?: string | null
          goal_id?: string
          id?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_comments_check_in_id_fkey"
            columns: ["check_in_id"]
            isOneToOne: false
            referencedRelation: "goal_check_ins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_comments_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "partner_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "goal_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      group_goals: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          group_id: string
          id: string
          status: string | null
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          group_id: string
          id?: string
          status?: string | null
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          group_id?: string
          id?: string
          status?: string | null
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_goals_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "accountability_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memberships: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: string
          status: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role?: string
          status?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "accountability_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "accountability_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      message_reactions: {
        Row: {
          created_at: string | null
          id: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "partner_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      notification_campaigns: {
        Row: {
          action_buttons: Json | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          notification_body: string
          notification_template_id: string | null
          notification_title: string
          total_sent: number
          total_triggered: number
          trigger_conditions: Json
          trigger_type: string
          updated_at: string
          user_segment: string
        }
        Insert: {
          action_buttons?: Json | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          notification_body: string
          notification_template_id?: string | null
          notification_title: string
          total_sent?: number
          total_triggered?: number
          trigger_conditions: Json
          trigger_type: string
          updated_at?: string
          user_segment?: string
        }
        Update: {
          action_buttons?: Json | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          notification_body?: string
          notification_template_id?: string | null
          notification_title?: string
          total_sent?: number
          total_triggered?: number
          trigger_conditions?: Json
          trigger_type?: string
          updated_at?: string
          user_segment?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_campaigns_notification_template_id_fkey"
            columns: ["notification_template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_clicks: {
        Row: {
          action: string | null
          clicked_at: string | null
          id: string
          notification_id: string
          user_id: string
        }
        Insert: {
          action?: string | null
          clicked_at?: string | null
          id?: string
          notification_id: string
          user_id: string
        }
        Update: {
          action?: string | null
          clicked_at?: string | null
          id?: string
          notification_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_clicks_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "push_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          action_buttons: Json | null
          body: string
          category: string | null
          created_at: string | null
          created_by: string
          icon: string | null
          id: string
          name: string
          title: string
          updated_at: string | null
        }
        Insert: {
          action_buttons?: Json | null
          body: string
          category?: string | null
          created_at?: string | null
          created_by: string
          icon?: string | null
          id?: string
          name: string
          title: string
          updated_at?: string | null
        }
        Update: {
          action_buttons?: Json | null
          body?: string
          category?: string | null
          created_at?: string | null
          created_by?: string
          icon?: string | null
          id?: string
          name?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      partner_achievements: {
        Row: {
          achievement_data: Json | null
          achievement_type: string
          created_at: string | null
          earned_at: string | null
          id: string
          partnership_id: string | null
          user_id: string
        }
        Insert: {
          achievement_data?: Json | null
          achievement_type: string
          created_at?: string | null
          earned_at?: string | null
          id?: string
          partnership_id?: string | null
          user_id: string
        }
        Update: {
          achievement_data?: Json | null
          achievement_type?: string
          created_at?: string | null
          earned_at?: string | null
          id?: string
          partnership_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_achievements_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "accountability_partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_goals: {
        Row: {
          created_at: string
          goal_text: string
          goal_type: string
          id: string
          partnership_id: string
          status: string
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_text: string
          goal_type: string
          id?: string
          partnership_id: string
          status?: string
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_text?: string
          goal_type?: string
          id?: string
          partnership_id?: string
          status?: string
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_goals_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "accountability_partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_messages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          message_type: string
          metadata: Json | null
          partnership_id: string
          read_at: string | null
          sender_id: string
          updated_at: string | null
          voice_duration: number | null
          voice_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          partnership_id: string
          read_at?: string | null
          sender_id: string
          updated_at?: string | null
          voice_duration?: number | null
          voice_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          message_type?: string
          metadata?: Json | null
          partnership_id?: string
          read_at?: string | null
          sender_id?: string
          updated_at?: string | null
          voice_duration?: number | null
          voice_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_messages_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "accountability_partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_progress_snapshots: {
        Row: {
          completion_rate: number | null
          created_at: string | null
          goals_completed: number | null
          goals_missed: number | null
          goals_partial: number | null
          id: string
          partnership_id: string
          snapshot_date: string
          streak_count: number | null
          user_id: string
        }
        Insert: {
          completion_rate?: number | null
          created_at?: string | null
          goals_completed?: number | null
          goals_missed?: number | null
          goals_partial?: number | null
          id?: string
          partnership_id: string
          snapshot_date?: string
          streak_count?: number | null
          user_id: string
        }
        Update: {
          completion_rate?: number | null
          created_at?: string | null
          goals_completed?: number | null
          goals_missed?: number | null
          goals_partial?: number | null
          id?: string
          partnership_id?: string
          snapshot_date?: string
          streak_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_progress_snapshots_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "accountability_partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_progress_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_reactions: {
        Row: {
          check_in_id: string
          created_at: string
          id: string
          message: string | null
          reaction_type: string
          reactor_id: string
        }
        Insert: {
          check_in_id: string
          created_at?: string
          id?: string
          message?: string | null
          reaction_type: string
          reactor_id: string
        }
        Update: {
          check_in_id?: string
          created_at?: string
          id?: string
          message?: string | null
          reaction_type?: string
          reactor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_reactions_check_in_id_fkey"
            columns: ["check_in_id"]
            isOneToOne: false
            referencedRelation: "goal_check_ins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_reactions_reactor_id_fkey"
            columns: ["reactor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_streaks: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_activity_date: string | null
          longest_streak: number | null
          partnership_id: string
          streak_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          partnership_id: string
          streak_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          partnership_id?: string
          streak_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_streaks_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "accountability_partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_weekly_shares: {
        Row: {
          created_at: string | null
          id: string
          is_visible: boolean | null
          partnership_id: string
          summary_data: Json
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          partnership_id: string
          summary_data: Json
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          partnership_id?: string
          summary_data?: Json
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_weekly_shares_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "accountability_partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_weekly_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_analytics: {
        Row: {
          calculated_at: string | null
          combined_profit_factor: number | null
          combined_win_rate: number | null
          completion_rate: number | null
          engagement_score: number | null
          group_id: string | null
          id: string
          partnership_id: string | null
          total_goals_completed: number | null
          total_goals_set: number | null
          week_end: string
          week_start: string
        }
        Insert: {
          calculated_at?: string | null
          combined_profit_factor?: number | null
          combined_win_rate?: number | null
          completion_rate?: number | null
          engagement_score?: number | null
          group_id?: string | null
          id?: string
          partnership_id?: string | null
          total_goals_completed?: number | null
          total_goals_set?: number | null
          week_end: string
          week_start: string
        }
        Update: {
          calculated_at?: string | null
          combined_profit_factor?: number | null
          combined_win_rate?: number | null
          completion_rate?: number | null
          engagement_score?: number | null
          group_id?: string | null
          id?: string
          partnership_id?: string | null
          total_goals_completed?: number | null
          total_goals_set?: number | null
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_analytics_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "accountability_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_analytics_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "accountability_partnerships"
            referencedColumns: ["id"]
          },
        ]
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
          avatar_url: string | null
          consent_date: string | null
          created_at: string | null
          credits_reset_date: string | null
          current_streak: number | null
          data_collection_consent: boolean | null
          display_name: string | null
          email: string | null
          email_notifications_enabled: boolean | null
          full_name: string | null
          id: string
          last_credit_check: string | null
          last_login_ip: string | null
          last_trade_date: string | null
          longest_streak: number | null
          monthly_trade_limit: number | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          signup_fingerprint: string | null
          signup_ip_address: string | null
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
          avatar_url?: string | null
          consent_date?: string | null
          created_at?: string | null
          credits_reset_date?: string | null
          current_streak?: number | null
          data_collection_consent?: boolean | null
          display_name?: string | null
          email?: string | null
          email_notifications_enabled?: boolean | null
          full_name?: string | null
          id: string
          last_credit_check?: string | null
          last_login_ip?: string | null
          last_trade_date?: string | null
          longest_streak?: number | null
          monthly_trade_limit?: number | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          signup_fingerprint?: string | null
          signup_ip_address?: string | null
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
          avatar_url?: string | null
          consent_date?: string | null
          created_at?: string | null
          credits_reset_date?: string | null
          current_streak?: number | null
          data_collection_consent?: boolean | null
          display_name?: string | null
          email?: string | null
          email_notifications_enabled?: boolean | null
          full_name?: string | null
          id?: string
          last_credit_check?: string | null
          last_login_ip?: string | null
          last_trade_date?: string | null
          longest_streak?: number | null
          monthly_trade_limit?: number | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          signup_fingerprint?: string | null
          signup_ip_address?: string | null
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
          action_buttons: Json | null
          admin_id: string
          body: string
          clicked_count: number | null
          created_at: string | null
          failed_count: number | null
          id: string
          opened_count: number | null
          scheduled_for: string | null
          sent_count: number | null
          status: string | null
          target_users: string[] | null
          template_id: string | null
          title: string
          user_segment: string | null
        }
        Insert: {
          action_buttons?: Json | null
          admin_id: string
          body: string
          clicked_count?: number | null
          created_at?: string | null
          failed_count?: number | null
          id?: string
          opened_count?: number | null
          scheduled_for?: string | null
          sent_count?: number | null
          status?: string | null
          target_users?: string[] | null
          template_id?: string | null
          title: string
          user_segment?: string | null
        }
        Update: {
          action_buttons?: Json | null
          admin_id?: string
          body?: string
          clicked_count?: number | null
          created_at?: string | null
          failed_count?: number | null
          id?: string
          opened_count?: number | null
          scheduled_for?: string | null
          sent_count?: number | null
          status?: string | null
          target_users?: string[] | null
          template_id?: string | null
          title?: string
          user_segment?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          device_info: string | null
          endpoint: string
          failed_attempts: number | null
          id: string
          is_active: boolean | null
          onesignal_player_id: string | null
          p256dh_key: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          device_info?: string | null
          endpoint: string
          failed_attempts?: number | null
          id?: string
          is_active?: boolean | null
          onesignal_player_id?: string | null
          p256dh_key: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          device_info?: string | null
          endpoint?: string
          failed_attempts?: number | null
          id?: string
          is_active?: boolean | null
          onesignal_player_id?: string | null
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
      scheduled_notifications: {
        Row: {
          action_buttons: Json | null
          body: string
          created_at: string | null
          created_by: string
          id: string
          recurrence: string | null
          scheduled_for: string
          sent_at: string | null
          status: string | null
          template_id: string | null
          title: string
          user_segment: string
        }
        Insert: {
          action_buttons?: Json | null
          body: string
          created_at?: string | null
          created_by: string
          id?: string
          recurrence?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
          title: string
          user_segment: string
        }
        Update: {
          action_buttons?: Json | null
          body?: string
          created_at?: string | null
          created_by?: string
          id?: string
          recurrence?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          template_id?: string | null
          title?: string
          user_segment?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_notifications_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      setup_ai_insights: {
        Row: {
          analysis_date: string | null
          confidence_score: number
          created_at: string | null
          focus_priority: string
          health_score: number
          id: string
          losing_patterns: Json | null
          performance_grade: string
          raw_analysis: string | null
          recommendations: Json | null
          setup_id: string | null
          strengths: Json | null
          user_id: string
          weaknesses: Json | null
          winning_patterns: Json | null
        }
        Insert: {
          analysis_date?: string | null
          confidence_score: number
          created_at?: string | null
          focus_priority: string
          health_score: number
          id?: string
          losing_patterns?: Json | null
          performance_grade: string
          raw_analysis?: string | null
          recommendations?: Json | null
          setup_id?: string | null
          strengths?: Json | null
          user_id: string
          weaknesses?: Json | null
          winning_patterns?: Json | null
        }
        Update: {
          analysis_date?: string | null
          confidence_score?: number
          created_at?: string | null
          focus_priority?: string
          health_score?: number
          id?: string
          losing_patterns?: Json | null
          performance_grade?: string
          raw_analysis?: string | null
          recommendations?: Json | null
          setup_id?: string | null
          strengths?: Json | null
          user_id?: string
          weaknesses?: Json | null
          winning_patterns?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "setup_ai_insights_setup_id_fkey"
            columns: ["setup_id"]
            isOneToOne: false
            referencedRelation: "setups"
            referencedColumns: ["id"]
          },
        ]
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
      trade_interceptions: {
        Row: {
          created_at: string | null
          id: string
          pattern_matched: string | null
          proposed_trade: Json
          risk_score: number
          similar_trades_count: number | null
          suggested_action: string
          user_action: string | null
          user_id: string
          win_rate: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          pattern_matched?: string | null
          proposed_trade: Json
          risk_score: number
          similar_trades_count?: number | null
          suggested_action: string
          user_action?: string | null
          user_id: string
          win_rate?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          pattern_matched?: string | null
          proposed_trade?: Json
          risk_score?: number
          similar_trades_count?: number | null
          suggested_action?: string
          user_action?: string | null
          user_id?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      trade_patterns: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          metadata: Json | null
          pattern_description: string
          pattern_type: string
          recommendations: string | null
          sample_size: number | null
          updated_at: string | null
          user_id: string
          win_rate: number | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          pattern_description: string
          pattern_type: string
          recommendations?: string | null
          sample_size?: number | null
          updated_at?: string | null
          user_id: string
          win_rate?: number | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          pattern_description?: string
          pattern_type?: string
          recommendations?: string | null
          sample_size?: number | null
          updated_at?: string | null
          user_id?: string
          win_rate?: number | null
        }
        Relationships: []
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
          ai_confidence: number | null
          ai_extracted_data: Json | null
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
          ai_confidence?: number | null
          ai_extracted_data?: Json | null
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
          ai_confidence?: number | null
          ai_extracted_data?: Json | null
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
      trading_behaviors: {
        Row: {
          ai_recommendation: string | null
          behavior_type: string
          created_at: string | null
          detected_at: string | null
          id: string
          is_resolved: boolean | null
          severity: string
          trade_sequence: Json | null
          user_id: string
        }
        Insert: {
          ai_recommendation?: string | null
          behavior_type: string
          created_at?: string | null
          detected_at?: string | null
          id?: string
          is_resolved?: boolean | null
          severity: string
          trade_sequence?: Json | null
          user_id: string
        }
        Update: {
          ai_recommendation?: string | null
          behavior_type?: string
          created_at?: string | null
          detected_at?: string | null
          id?: string
          is_resolved?: boolean | null
          severity?: string
          trade_sequence?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          id: string
          is_typing: boolean | null
          partnership_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          is_typing?: boolean | null
          partnership_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          is_typing?: boolean | null
          partnership_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "accountability_partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      award_credits: {
        Args: {
          p_credits: number
          p_description?: string
          p_earning_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      can_send_email: {
        Args: { check_domain: string; email_count?: number }
        Returns: boolean
      }
      can_view_group: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_function_name: string
          p_max_requests?: number
          p_user_id: string
          p_window_minutes?: number
        }
        Returns: boolean
      }
      clean_old_typing_indicators: { Args: never; Returns: undefined }
      create_test_partner_for_user: {
        Args: { p_user_id: string }
        Returns: string
      }
      delete_all_user_data: { Args: { p_user_id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_campaign_stat: {
        Args: { campaign_id: string; stat_name: string }
        Returns: undefined
      }
      increment_variant_stat: {
        Args: { stat_name: string; variant_id: string }
        Returns: undefined
      }
      increment_warmup_limits: { Args: never; Returns: undefined }
      is_email_suppressed: { Args: { check_email: string }; Returns: boolean }
      is_group_admin: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      record_email_send: {
        Args: { send_count?: number; send_domain: string }
        Returns: undefined
      }
      reset_monthly_credits: { Args: never; Returns: undefined }
      update_partner_streak: {
        Args: {
          p_partnership_id: string
          p_streak_type: string
          p_user_id: string
        }
        Returns: undefined
      }
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
