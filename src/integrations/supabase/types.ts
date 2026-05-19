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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      academy_access_codes: {
        Row: {
          code: string
          course_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number
          notes: string | null
          used_count: number
        }
        Insert: {
          code: string
          course_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          notes?: string | null
          used_count?: number
        }
        Update: {
          code?: string
          course_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          notes?: string | null
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "academy_access_codes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_broadcasts: {
        Row: {
          audience: string
          audience_filter: Json
          body: string
          channels: string[]
          created_at: string
          created_by: string | null
          id: string
          link: string | null
          sent_at: string | null
          sent_count: number
          status: string
          title: string
        }
        Insert: {
          audience?: string
          audience_filter?: Json
          body: string
          channels?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          link?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          title: string
        }
        Update: {
          audience?: string
          audience_filter?: Json
          body?: string
          channels?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          link?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          title?: string
        }
        Relationships: []
      }
      academy_certificates: {
        Row: {
          certificate_number: string
          course_id: string
          course_title: string
          id: string
          issued_at: string
          pdf_url: string | null
          recipient_name: string
          user_id: string
        }
        Insert: {
          certificate_number: string
          course_id: string
          course_title: string
          id?: string
          issued_at?: string
          pdf_url?: string | null
          recipient_name: string
          user_id: string
        }
        Update: {
          certificate_number?: string
          course_id?: string
          course_title?: string
          id?: string
          issued_at?: string
          pdf_url?: string | null
          recipient_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_courses: {
        Row: {
          cover_url: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          display_order: number
          duration_minutes: number
          enrollments_count: number
          id: string
          instructor_id: string | null
          instructor_name: string | null
          is_featured: boolean
          is_free: boolean
          level: string
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          preview_percent: number
          price: number
          slug: string
          status: string
          subtitle: string | null
          title: string
          total_lessons: number
          trailer_url: string | null
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          display_order?: number
          duration_minutes?: number
          enrollments_count?: number
          id?: string
          instructor_id?: string | null
          instructor_name?: string | null
          is_featured?: boolean
          is_free?: boolean
          level?: string
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          preview_percent?: number
          price?: number
          slug: string
          status?: string
          subtitle?: string | null
          title: string
          total_lessons?: number
          trailer_url?: string | null
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          display_order?: number
          duration_minutes?: number
          enrollments_count?: number
          id?: string
          instructor_id?: string | null
          instructor_name?: string | null
          is_featured?: boolean
          is_free?: boolean
          level?: string
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          preview_percent?: number
          price?: number
          slug?: string
          status?: string
          subtitle?: string | null
          title?: string
          total_lessons?: number
          trailer_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      academy_enrollments: {
        Row: {
          access_code: string | null
          amount_paid: number
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          last_accessed_at: string | null
          last_lesson_id: string | null
          order_id: string | null
          progress_percent: number
          source: string
          status: string
          user_id: string
        }
        Insert: {
          access_code?: string | null
          amount_paid?: number
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          last_accessed_at?: string | null
          last_lesson_id?: string | null
          order_id?: string | null
          progress_percent?: number
          source?: string
          status?: string
          user_id: string
        }
        Update: {
          access_code?: string | null
          amount_paid?: number
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          last_accessed_at?: string | null
          last_lesson_id?: string | null
          order_id?: string | null
          progress_percent?: number
          source?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_enrollments_last_lesson_id_fkey"
            columns: ["last_lesson_id"]
            isOneToOne: false
            referencedRelation: "academy_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_lesson_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          id: string
          is_completed: boolean
          lesson_id: string
          position_seconds: number
          updated_at: string
          user_id: string
          watch_time_seconds: number
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          id?: string
          is_completed?: boolean
          lesson_id: string
          position_seconds?: number
          updated_at?: string
          user_id: string
          watch_time_seconds?: number
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          id?: string
          is_completed?: boolean
          lesson_id?: string
          position_seconds?: number
          updated_at?: string
          user_id?: string
          watch_time_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "academy_lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "academy_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_lesson_qa: {
        Row: {
          body: string
          course_id: string
          created_at: string
          id: string
          is_instructor: boolean
          lesson_id: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          body: string
          course_id: string
          created_at?: string
          id?: string
          is_instructor?: boolean
          lesson_id: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          body?: string
          course_id?: string
          created_at?: string
          id?: string
          is_instructor?: boolean
          lesson_id?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      academy_lessons: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          display_order: number
          duration_seconds: number
          id: string
          is_preview: boolean
          module_id: string
          resources: Json
          title: string
          updated_at: string
          video_path: string | null
          video_provider: string
          video_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          duration_seconds?: number
          id?: string
          is_preview?: boolean
          module_id: string
          resources?: Json
          title: string
          updated_at?: string
          video_path?: string | null
          video_provider?: string
          video_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          duration_seconds?: number
          id?: string
          is_preview?: boolean
          module_id?: string
          resources?: Json
          title?: string
          updated_at?: string
          video_path?: string | null
          video_provider?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "academy_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_podcast_series: {
        Row: {
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          host_name: string | null
          id: string
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
          youtube_playlist_id: string | null
          youtube_playlist_url: string | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          host_name?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
          youtube_playlist_id?: string | null
          youtube_playlist_url?: string | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          host_name?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
          youtube_playlist_id?: string | null
          youtube_playlist_url?: string | null
        }
        Relationships: []
      }
      academy_podcasts: {
        Row: {
          audio_error: string | null
          audio_generated_at: string | null
          audio_status: string
          audio_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number | null
          episode_number: number | null
          id: string
          is_active: boolean
          kind: string
          series_id: string | null
          sort_order: number
          source_url: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          views_count: number
          visibility: string
          youtube_video_id: string | null
        }
        Insert: {
          audio_error?: string | null
          audio_generated_at?: string | null
          audio_status?: string
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          episode_number?: number | null
          id?: string
          is_active?: boolean
          kind?: string
          series_id?: string | null
          sort_order?: number
          source_url: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          views_count?: number
          visibility?: string
          youtube_video_id?: string | null
        }
        Update: {
          audio_error?: string | null
          audio_generated_at?: string | null
          audio_status?: string
          audio_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number | null
          episode_number?: number | null
          id?: string
          is_active?: boolean
          kind?: string
          series_id?: string | null
          sort_order?: number
          source_url?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          views_count?: number
          visibility?: string
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_podcasts_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "academy_podcast_series"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_quiz_attempts: {
        Row: {
          answers: Json
          created_at: string
          id: string
          passed: boolean
          quiz_id: string
          score_percent: number
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          passed?: boolean
          quiz_id: string
          score_percent?: number
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          passed?: boolean
          quiz_id?: string
          score_percent?: number
          user_id?: string
        }
        Relationships: []
      }
      academy_quiz_questions: {
        Row: {
          choices: Json
          correct_index: number
          display_order: number
          id: string
          question: string
          quiz_id: string
        }
        Insert: {
          choices?: Json
          correct_index?: number
          display_order?: number
          id?: string
          question: string
          quiz_id: string
        }
        Update: {
          choices?: Json
          correct_index?: number
          display_order?: number
          id?: string
          question?: string
          quiz_id?: string
        }
        Relationships: []
      }
      academy_quizzes: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          module_id: string | null
          pass_percent: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string | null
          pass_percent?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          module_id?: string | null
          pass_percent?: number
          title?: string
        }
        Relationships: []
      }
      academy_reviews: {
        Row: {
          body: string | null
          course_id: string
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          course_id: string
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          course_id?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      academy_view_events: {
        Row: {
          course_id: string | null
          created_at: string
          duration_seconds: number | null
          event_type: string
          id: string
          item_id: string
          item_type: string
          percent: number | null
          position_seconds: number | null
          series_id: string | null
          user_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          event_type: string
          id?: string
          item_id: string
          item_type: string
          percent?: number | null
          position_seconds?: number | null
          series_id?: string | null
          user_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          event_type?: string
          id?: string
          item_id?: string
          item_type?: string
          percent?: number | null
          position_seconds?: number | null
          series_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      academy_webinar_qa: {
        Row: {
          answered: boolean
          created_at: string
          id: string
          is_pinned: boolean
          question: string
          user_id: string
          webinar_id: string
        }
        Insert: {
          answered?: boolean
          created_at?: string
          id?: string
          is_pinned?: boolean
          question: string
          user_id: string
          webinar_id: string
        }
        Update: {
          answered?: boolean
          created_at?: string
          id?: string
          is_pinned?: boolean
          question?: string
          user_id?: string
          webinar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_webinar_qa_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "academy_webinars"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_webinar_registrations: {
        Row: {
          attended: boolean
          id: string
          registered_at: string
          user_id: string
          webinar_id: string
        }
        Insert: {
          attended?: boolean
          id?: string
          registered_at?: string
          user_id: string
          webinar_id: string
        }
        Update: {
          attended?: boolean
          id?: string
          registered_at?: string
          user_id?: string
          webinar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_webinar_registrations_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "academy_webinars"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_webinars: {
        Row: {
          course_id: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_free: boolean
          join_url: string | null
          max_attendees: number
          price: number
          provider: string
          recording_url: string | null
          scheduled_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_free?: boolean
          join_url?: string | null
          max_attendees?: number
          price?: number
          provider?: string
          recording_url?: string | null
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_free?: boolean
          join_url?: string | null
          max_attendees?: number
          price?: number
          provider?: string
          recording_url?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_webinars_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "academy_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_banner_events: {
        Row: {
          banner_id: string
          created_at: string
          event_type: string
          id: string
          referrer: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          banner_id: string
          created_at?: string
          event_type: string
          id?: string
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          banner_id?: string
          created_at?: string
          event_type?: string
          id?: string
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_banner_events_banner_id_fkey"
            columns: ["banner_id"]
            isOneToOne: false
            referencedRelation: "ad_banners"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_banners: {
        Row: {
          bypass_vip: boolean
          clicks_count: number
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          image_url: string
          is_active: boolean
          position: string
          starts_at: string
          target_url: string
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          bypass_vip?: boolean
          clicks_count?: number
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          position?: string
          starts_at?: string
          target_url: string
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          bypass_vip?: boolean
          clicks_count?: number
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          position?: string
          starts_at?: string
          target_url?: string
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: []
      }
      admin_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          related_customer_id: string | null
          related_deal_id: string | null
          related_lead_id: string | null
          related_order_id: string | null
          related_pro_id: string | null
          related_supplier_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          related_customer_id?: string | null
          related_deal_id?: string | null
          related_lead_id?: string | null
          related_order_id?: string | null
          related_pro_id?: string | null
          related_supplier_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          related_customer_id?: string | null
          related_deal_id?: string | null
          related_lead_id?: string | null
          related_order_id?: string | null
          related_pro_id?: string | null
          related_supplier_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_tasks_related_lead_id_fkey"
            columns: ["related_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_tasks_related_supplier_id_fkey"
            columns: ["related_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_applications: {
        Row: {
          admin_notes: string | null
          audience: string | null
          created_at: string
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          audience?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          audience?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          affiliate_id: string
          created_at: string
          id: string
          ref_code: string
          referrer: string | null
          target_path: string | null
          user_agent: string | null
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          id?: string
          ref_code: string
          referrer?: string | null
          target_path?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          id?: string
          ref_code?: string
          referrer?: string | null
          target_path?: string | null
          user_agent?: string | null
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commission_overrides: {
        Row: {
          commission_percent: number
          created_at: string
          id: string
          scope_id: string
          scope_type: string
        }
        Insert: {
          commission_percent: number
          created_at?: string
          id?: string
          scope_id: string
          scope_type: string
        }
        Update: {
          commission_percent?: number
          created_at?: string
          id?: string
          scope_id?: string
          scope_type?: string
        }
        Relationships: []
      }
      affiliate_conversions: {
        Row: {
          affiliate_id: string
          approved_at: string | null
          commission_amount: number
          commission_percent: number
          created_at: string
          id: string
          notes: string | null
          order_amount: number
          order_id: string | null
          paid_at: string | null
          scope_id: string
          scope_type: string
          status: string
          user_id: string | null
        }
        Insert: {
          affiliate_id: string
          approved_at?: string | null
          commission_amount?: number
          commission_percent?: number
          created_at?: string
          id?: string
          notes?: string | null
          order_amount?: number
          order_id?: string | null
          paid_at?: string | null
          scope_id: string
          scope_type: string
          status?: string
          user_id?: string | null
        }
        Update: {
          affiliate_id?: string
          approved_at?: string | null
          commission_amount?: number
          commission_percent?: number
          created_at?: string
          id?: string
          notes?: string | null
          order_amount?: number
          order_id?: string | null
          paid_at?: string | null
          scope_id?: string
          scope_type?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_conversions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payout_requests: {
        Row: {
          admin_notes: string | null
          affiliate_id: string
          amount: number
          created_at: string
          id: string
          paid_at: string | null
          payment_details: Json
          payment_method: string
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          affiliate_id: string
          amount: number
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_details?: Json
          payment_method: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          affiliate_id?: string
          amount?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_details?: Json
          payment_method?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payout_requests_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_settings: {
        Row: {
          cookie_days: number
          default_commission_percent: number
          id: number
          min_payout: number
          updated_at: string
        }
        Insert: {
          cookie_days?: number
          default_commission_percent?: number
          id?: number
          min_payout?: number
          updated_at?: string
        }
        Update: {
          cookie_days?: number
          default_commission_percent?: number
          id?: number
          min_payout?: number
          updated_at?: string
        }
        Relationships: []
      }
      affiliates: {
        Row: {
          commission_percent: number | null
          created_at: string
          id: string
          is_active: boolean
          ref_code: string
          total_clicks: number
          total_conversions: number
          total_earned: number
          total_paid: number
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_percent?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          ref_code: string
          total_clicks?: number
          total_conversions?: number
          total_earned?: number
          total_paid?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_percent?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          ref_code?: string
          total_clicks?: number
          total_conversions?: number
          total_earned?: number
          total_paid?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_prompts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          model: string
          prompt: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          model?: string
          prompt: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          model?: string
          prompt?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          action_config: Json
          action_type: Database["public"]["Enums"]["automation_action"]
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          run_count: number
          trigger_condition: Json
          trigger_type: Database["public"]["Enums"]["automation_trigger"]
          updated_at: string
        }
        Insert: {
          action_config?: Json
          action_type: Database["public"]["Enums"]["automation_action"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          run_count?: number
          trigger_condition?: Json
          trigger_type: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
        }
        Update: {
          action_config?: Json
          action_type?: Database["public"]["Enums"]["automation_action"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          run_count?: number
          trigger_condition?: Json
          trigger_type?: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
        }
        Relationships: []
      }
      automation_runs: {
        Row: {
          context: Json | null
          created_at: string
          error_message: string | null
          id: string
          rule_id: string
          status: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          rule_id: string
          status: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          rule_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_settings: {
        Row: {
          abandoned_cart_delay_hours: number
          abandoned_cart_enabled: boolean
          id: string
          newsletter_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          abandoned_cart_delay_hours?: number
          abandoned_cart_enabled?: boolean
          id?: string
          newsletter_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          abandoned_cart_delay_hours?: number
          abandoned_cart_enabled?: boolean
          id?: string
          newsletter_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      broadcast_history: {
        Row: {
          admin_id: string | null
          id: string
          link: string | null
          message: string
          recipient_count: number
          sent_at: string
          target_group: string
          title: string
        }
        Insert: {
          admin_id?: string | null
          id?: string
          link?: string | null
          message: string
          recipient_count?: number
          sent_at?: string
          target_group: string
          title: string
        }
        Update: {
          admin_id?: string | null
          id?: string
          link?: string | null
          message?: string
          recipient_count?: number
          sent_at?: string
          target_group?: string
          title?: string
        }
        Relationships: []
      }
      business_rules: {
        Row: {
          allowed: boolean
          created_at: string
          discount_percent: number | null
          id: string
          notes: string | null
          product_type_id: string
          tier_id: string
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          discount_percent?: number | null
          id?: string
          notes?: string | null
          product_type_id: string
          tier_id: string
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          discount_percent?: number | null
          id?: string
          notes?: string | null
          product_type_id?: string
          tier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_rules_product_type_id_fkey"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          abandoned_notified_at: string | null
          added_at: string
          id: string
          image: string | null
          info_file_extension: string | null
          price: number
          product_id: string
          product_slug: string | null
          product_type: string
          qty: number
          requires_info_file: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          abandoned_notified_at?: string | null
          added_at?: string
          id?: string
          image?: string | null
          info_file_extension?: string | null
          price?: number
          product_id: string
          product_slug?: string | null
          product_type?: string
          qty?: number
          requires_info_file?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          abandoned_notified_at?: string | null
          added_at?: string
          id?: string
          image?: string | null
          info_file_extension?: string | null
          price?: number
          product_id?: string
          product_slug?: string | null
          product_type?: string
          qty?: number
          requires_info_file?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      core_chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "core_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      core_chat_threads: {
        Row: {
          context_id: string | null
          context_type: string
          created_at: string
          id: string
          last_message_at: string
          last_message_preview: string | null
          unread_a: number
          unread_b: number
          updated_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          context_id?: string | null
          context_type: string
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          unread_a?: number
          unread_b?: number
          updated_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          context_id?: string | null
          context_type?: string
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          unread_a?: number
          unread_b?: number
          updated_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      customer_interactions: {
        Row: {
          created_at: string
          created_by: string | null
          custom_type: string | null
          customer_id: string
          description: string | null
          id: string
          occurred_at: string
          title: string
          type: Database["public"]["Enums"]["interaction_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_type?: string | null
          customer_id: string
          description?: string | null
          id?: string
          occurred_at?: string
          title: string
          type?: Database["public"]["Enums"]["interaction_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_type?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          occurred_at?: string
          title?: string
          type?: Database["public"]["Enums"]["interaction_type"]
        }
        Relationships: []
      }
      customer_tags: {
        Row: {
          category: string | null
          color: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          tag: string
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          tag: string
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          tag?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string
          id: string
          lead_id: string | null
          notes: string | null
          position: number
          source_ref_id: string | null
          source_type: string | null
          status: string
          title: string | null
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          position?: number
          source_ref_id?: string | null
          source_type?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          position?: number
          source_ref_id?: string | null
          source_type?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          clicked_at: string | null
          created_at: string
          error_message: string | null
          id: string
          opened_at: string | null
          recipient_email: string
          recipient_user_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["email_status"]
          subject: string
          template: string | null
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          recipient_email: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          subject: string
          template?: string | null
        }
        Update: {
          clicked_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          recipient_email?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          subject?: string
          template?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      entitlement_audit_log: {
        Row: {
          action_type: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          new_mode: string | null
          previous_mode: string | null
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          new_mode?: string | null
          previous_mode?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          new_mode?: string | null
          previous_mode?: string | null
        }
        Relationships: []
      }
      entitlement_control_plane: {
        Row: {
          allow_auto_rollback: boolean
          confidence_threshold_ssot: number
          created_at: string
          drift_threshold_rollback: number
          drift_threshold_warning: number
          id: string
          is_active: boolean
          mode: string
          rollout_percentage: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allow_auto_rollback?: boolean
          confidence_threshold_ssot?: number
          created_at?: string
          drift_threshold_rollback?: number
          drift_threshold_warning?: number
          id?: string
          is_active?: boolean
          mode?: string
          rollout_percentage?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allow_auto_rollback?: boolean
          confidence_threshold_ssot?: number
          created_at?: string
          drift_threshold_rollback?: number
          drift_threshold_warning?: number
          id?: string
          is_active?: boolean
          mode?: string
          rollout_percentage?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      equipment_catalog: {
        Row: {
          brand: string
          category: string
          created_at: string
          id: string
          image_url: string | null
          model: string
          specifications: Json
          subcategory: string | null
        }
        Insert: {
          brand: string
          category: string
          created_at?: string
          id?: string
          image_url?: string | null
          model: string
          specifications?: Json
          subcategory?: string | null
        }
        Update: {
          brand?: string
          category?: string
          created_at?: string
          id?: string
          image_url?: string | null
          model?: string
          specifications?: Json
          subcategory?: string | null
        }
        Relationships: []
      }
      forum_badges: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      forum_boards: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          last_post_at: string | null
          last_topic_id: string | null
          name: string
          post_count: number
          post_min_role: string
          slug: string
          topic_count: number
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          last_post_at?: string | null
          last_topic_id?: string | null
          name: string
          post_count?: number
          post_min_role?: string
          slug: string
          topic_count?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          last_post_at?: string | null
          last_topic_id?: string | null
          name?: string
          post_count?: number
          post_min_role?: string
          slug?: string
          topic_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "forum_boards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      forum_direct_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_direct_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "forum_dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_dm_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          last_message_preview: string | null
          unread_a: number
          unread_b: number
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          unread_a?: number
          unread_b?: number
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          unread_a?: number
          unread_b?: number
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      forum_moderation_log: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          moderator_id: string
          notes: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          moderator_id: string
          notes?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          moderator_id?: string
          notes?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      forum_notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          metadata: Json | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      forum_post_votes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "forum_post_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          author_id: string
          body_md: string
          created_at: string
          edited_at: string | null
          id: string
          is_deleted: boolean
          is_op: boolean
          parent_post_id: string | null
          quoted_post_id: string | null
          search_tsv: unknown
          topic_id: string
        }
        Insert: {
          author_id: string
          body_md: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          is_op?: boolean
          parent_post_id?: string | null
          quoted_post_id?: string | null
          search_tsv?: unknown
          topic_id: string
        }
        Update: {
          author_id?: string
          body_md?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          is_op?: boolean
          parent_post_id?: string | null
          quoted_post_id?: string | null
          search_tsv?: unknown
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_parent_post_id_fkey"
            columns: ["parent_post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_quoted_post_id_fkey"
            columns: ["quoted_post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      forum_subscriptions: {
        Row: {
          created_at: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      forum_tags: {
        Row: {
          color: string | null
          created_at: string
          display_order: number
          id: string
          is_staff_only: boolean
          name: string
          parent_id: string | null
          slug: string
          use_count: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_staff_only?: boolean
          name: string
          parent_id?: string | null
          slug: string
          use_count?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_staff_only?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "forum_tags_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "forum_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_topic_tags: {
        Row: {
          tag_id: string
          topic_id: string
        }
        Insert: {
          tag_id: string
          topic_id: string
        }
        Update: {
          tag_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_topic_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "forum_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_topic_tags_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_topics: {
        Row: {
          author_id: string
          board_id: string
          created_at: string
          id: string
          is_deleted: boolean
          is_locked: boolean
          is_pinned: boolean
          last_post_at: string
          last_post_user_id: string | null
          reply_count: number
          slug: string
          solved_post_id: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          board_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_locked?: boolean
          is_pinned?: boolean
          last_post_at?: string
          last_post_user_id?: string | null
          reply_count?: number
          slug: string
          solved_post_id?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          board_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_locked?: boolean
          is_pinned?: boolean
          last_post_at?: string
          last_post_user_id?: string | null
          reply_count?: number
          slug?: string
          solved_post_id?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "forum_topics_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "forum_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_topics_solved_post_id_fkey"
            columns: ["solved_post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_user_badges: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          badge_id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "forum_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      keyboard_models: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          model_name: string
          ui_image_url: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          model_name: string
          ui_image_url?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          model_name?: string
          ui_image_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "keyboard_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          created_at: string
          custom_source: string | null
          customer_id: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          source: Database["public"]["Enums"]["lead_source"]
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          custom_source?: string | null
          customer_id?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          custom_source?: string | null
          customer_id?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_business_sellers: {
        Row: {
          business_name: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_verified: boolean
          notes: string | null
          phone: string | null
          subscription_expires_at: string | null
          subscription_status: string
          updated_at: string
          user_id: string
          verified_sales_count: number
        }
        Insert: {
          business_name: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_verified?: boolean
          notes?: string | null
          phone?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string
          updated_at?: string
          user_id: string
          verified_sales_count?: number
        }
        Update: {
          business_name?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_verified?: boolean
          notes?: string | null
          phone?: string | null
          subscription_expires_at?: string | null
          subscription_status?: string
          updated_at?: string
          user_id?: string
          verified_sales_count?: number
        }
        Relationships: []
      }
      marketplace_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          label: string
          slug: string
          subcategories: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          label: string
          slug: string
          subcategories?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          label?: string
          slug?: string
          subcategories?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "marketplace_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_chat_threads: {
        Row: {
          buyer_id: string
          buyer_unread: number
          created_at: string
          id: string
          last_message_at: string
          last_message_preview: string | null
          listing_id: string
          seller_id: string
          seller_unread: number
        }
        Insert: {
          buyer_id: string
          buyer_unread?: number
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          listing_id: string
          seller_id: string
          seller_unread?: number
        }
        Update: {
          buyer_id?: string
          buyer_unread?: number
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          listing_id?: string
          seller_id?: string
          seller_unread?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_chat_threads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_deal_confirmations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          listing_id: string
          responded_at: string | null
          seller_id: string
          status: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          listing_id: string
          responded_at?: string | null
          seller_id: string
          status?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          responded_at?: string | null
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_deal_confirmations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_likes: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_likes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listing_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          listing_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          listing_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          listing_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listing_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          admin_notes: string | null
          audio_url: string | null
          brand: string | null
          bump_expires_at: string | null
          bumped_at: string | null
          buyer_id: string | null
          category: string
          city: string | null
          created_at: string
          currency: string
          custom_brand: string | null
          custom_category: string | null
          custom_subcategory: string | null
          description: string | null
          followup_sent_at: string | null
          id: string
          images: string[] | null
          is_sold: boolean
          is_urgent: boolean
          item_condition: string
          model: string | null
          phone: string | null
          price: number
          region: string | null
          seller_id: string
          seller_type: string
          sold_at: string | null
          specs: Json | null
          status: string
          subcategory: string | null
          title: string
          updated_at: string
          video_url: string | null
          views_count: number
          whatsapp: string | null
        }
        Insert: {
          admin_notes?: string | null
          audio_url?: string | null
          brand?: string | null
          bump_expires_at?: string | null
          bumped_at?: string | null
          buyer_id?: string | null
          category: string
          city?: string | null
          created_at?: string
          currency?: string
          custom_brand?: string | null
          custom_category?: string | null
          custom_subcategory?: string | null
          description?: string | null
          followup_sent_at?: string | null
          id?: string
          images?: string[] | null
          is_sold?: boolean
          is_urgent?: boolean
          item_condition?: string
          model?: string | null
          phone?: string | null
          price?: number
          region?: string | null
          seller_id: string
          seller_type?: string
          sold_at?: string | null
          specs?: Json | null
          status?: string
          subcategory?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
          views_count?: number
          whatsapp?: string | null
        }
        Update: {
          admin_notes?: string | null
          audio_url?: string | null
          brand?: string | null
          bump_expires_at?: string | null
          bumped_at?: string | null
          buyer_id?: string | null
          category?: string
          city?: string | null
          created_at?: string
          currency?: string
          custom_brand?: string | null
          custom_category?: string | null
          custom_subcategory?: string | null
          description?: string | null
          followup_sent_at?: string | null
          id?: string
          images?: string[] | null
          is_sold?: boolean
          is_urgent?: boolean
          item_condition?: string
          model?: string | null
          phone?: string | null
          price?: number
          region?: string | null
          seller_id?: string
          seller_type?: string
          sold_at?: string | null
          specs?: Json | null
          status?: string
          subcategory?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
          views_count?: number
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_seller_profile_fk"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_offers: {
        Row: {
          buyer_id: string
          buyer_message: string | null
          counter_amount: number | null
          created_at: string
          id: string
          listing_id: string
          offer_amount: number
          seller_id: string
          seller_message: string | null
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          buyer_message?: string | null
          counter_amount?: number | null
          created_at?: string
          id?: string
          listing_id: string
          offer_amount: number
          seller_id: string
          seller_message?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          buyer_message?: string | null
          counter_amount?: number | null
          created_at?: string
          id?: string
          listing_id?: string
          offer_amount?: number
          seller_id?: string
          seller_message?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          listing_id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_verified_purchase: boolean
          listing_id: string | null
          rating: number
          reviewer_id: string
          seller_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_verified_purchase?: boolean
          listing_id?: string | null
          rating: number
          reviewer_id: string
          seller_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_verified_purchase?: boolean
          listing_id?: string | null
          rating?: number
          reviewer_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_saved_searches: {
        Row: {
          created_at: string
          filters: Json
          id: string
          last_notified_at: string | null
          name: string
          notify_email: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          last_notified_at?: string | null
          name: string
          notify_email?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          last_notified_at?: string | null
          name?: string
          notify_email?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marketplace_settings: {
        Row: {
          auto_approve_listings: boolean
          followup_days: number
          followup_enabled: boolean
          id: number
          updated_at: string
        }
        Insert: {
          auto_approve_listings?: boolean
          followup_days?: number
          followup_enabled?: boolean
          id?: number
          updated_at?: string
        }
        Update: {
          auto_approve_listings?: boolean
          followup_days?: number
          followup_enabled?: boolean
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_trusted_sellers: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      marketplace_wanted: {
        Row: {
          brand: string | null
          budget_max: number | null
          budget_min: number | null
          category: string | null
          created_at: string
          description: string
          id: string
          model: string | null
          status: string
          subcategory: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          budget_max?: number | null
          budget_min?: number | null
          category?: string | null
          created_at?: string
          description: string
          id?: string
          model?: string | null
          status?: string
          subcategory?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          budget_max?: number | null
          budget_min?: number | null
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          model?: string | null
          status?: string
          subcategory?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      music_news: {
        Row: {
          approval_status: string | null
          author_id: string | null
          category: string
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          is_automated: boolean | null
          is_featured: boolean | null
          short_video_id: string | null
          slug: string
          source_url: string | null
          submitted_by_pr: boolean | null
          summary: string | null
          title: string
          updated_at: string | null
          video_url: string | null
          views_count: number | null
        }
        Insert: {
          approval_status?: string | null
          author_id?: string | null
          category: string
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_automated?: boolean | null
          is_featured?: boolean | null
          short_video_id?: string | null
          slug: string
          source_url?: string | null
          submitted_by_pr?: boolean | null
          summary?: string | null
          title: string
          updated_at?: string | null
          video_url?: string | null
          views_count?: number | null
        }
        Update: {
          approval_status?: string | null
          author_id?: string | null
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_automated?: boolean | null
          is_featured?: boolean | null
          short_video_id?: string | null
          slug?: string
          source_url?: string | null
          submitted_by_pr?: boolean | null
          summary?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "music_news_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      music_pro_calendar_events: {
        Row: {
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string
          event_type: string | null
          id: string
          is_external: boolean
          notes: string | null
          pro_id: string
          pro_user_id: string | null
          source: string
          source_ref_id: string | null
          start_time: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date: string
          event_type?: string | null
          id?: string
          is_external?: boolean
          notes?: string | null
          pro_id: string
          pro_user_id?: string | null
          source?: string
          source_ref_id?: string | null
          start_time?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_type?: string | null
          id?: string
          is_external?: boolean
          notes?: string | null
          pro_id?: string
          pro_user_id?: string | null
          source?: string
          source_ref_id?: string | null
          start_time?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_pro_calendar_events_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "music_pros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_pro_calendar_events_pro_user_id_fkey"
            columns: ["pro_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      music_pro_inquiries: {
        Row: {
          budget: number | null
          contact_email: string | null
          contact_phone: string
          created_at: string
          event_date: string | null
          event_type: string
          id: string
          location: string | null
          message: string | null
          pro_id: string
          sender_id: string | null
          sender_name: string
          status: string
          updated_at: string
        }
        Insert: {
          budget?: number | null
          contact_email?: string | null
          contact_phone: string
          created_at?: string
          event_date?: string | null
          event_type: string
          id?: string
          location?: string | null
          message?: string | null
          pro_id: string
          sender_id?: string | null
          sender_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          budget?: number | null
          contact_email?: string | null
          contact_phone?: string
          created_at?: string
          event_date?: string | null
          event_type?: string
          id?: string
          location?: string | null
          message?: string | null
          pro_id?: string
          sender_id?: string | null
          sender_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_pro_inquiries_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "music_pros"
            referencedColumns: ["id"]
          },
        ]
      }
      music_pro_media: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_featured: boolean
          pro_id: string
          title: string | null
          type: string
          url: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_featured?: boolean
          pro_id: string
          title?: string | null
          type: string
          url: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_featured?: boolean
          pro_id?: string
          title?: string | null
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_pro_media_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "music_pros"
            referencedColumns: ["id"]
          },
        ]
      }
      music_pro_packages: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          price: number
          pro_id: string
          title: string
          unit: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          price?: number
          pro_id: string
          title: string
          unit?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          price?: number
          pro_id?: string
          title?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_pro_packages_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "music_pros"
            referencedColumns: ["id"]
          },
        ]
      }
      music_pro_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          inquiry_id: string | null
          is_approved: boolean
          is_verified: boolean
          pro_id: string
          rating: number
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          inquiry_id?: string | null
          is_approved?: boolean
          is_verified?: boolean
          pro_id: string
          rating: number
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          inquiry_id?: string | null
          is_approved?: boolean
          is_verified?: boolean
          pro_id?: string
          rating?: number
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_pro_reviews_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "music_pro_inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "music_pro_reviews_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "music_pros"
            referencedColumns: ["id"]
          },
        ]
      }
      music_pros: {
        Row: {
          admin_notes: string | null
          bio: string | null
          brand_color: string | null
          cities: string[]
          cover_image: string | null
          created_at: string
          display_name: string
          email: string | null
          gear_list: string[]
          genres: string[]
          headline: string | null
          hourly_price_min: number | null
          id: string
          instagram: string | null
          is_featured: boolean
          is_verified: boolean
          phone: string | null
          profile_image: string | null
          region: string | null
          show_phone_public: boolean
          show_whatsapp_public: boolean
          specialties: string[]
          status: string
          subscription_tier: string
          updated_at: string
          user_id: string
          views_count: number
          website: string | null
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          admin_notes?: string | null
          bio?: string | null
          brand_color?: string | null
          cities?: string[]
          cover_image?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          gear_list?: string[]
          genres?: string[]
          headline?: string | null
          hourly_price_min?: number | null
          id?: string
          instagram?: string | null
          is_featured?: boolean
          is_verified?: boolean
          phone?: string | null
          profile_image?: string | null
          region?: string | null
          show_phone_public?: boolean
          show_whatsapp_public?: boolean
          specialties?: string[]
          status?: string
          subscription_tier?: string
          updated_at?: string
          user_id: string
          views_count?: number
          website?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          admin_notes?: string | null
          bio?: string | null
          brand_color?: string | null
          cities?: string[]
          cover_image?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          gear_list?: string[]
          genres?: string[]
          headline?: string | null
          hourly_price_min?: number | null
          id?: string
          instagram?: string | null
          is_featured?: boolean
          is_verified?: boolean
          phone?: string | null
          profile_image?: string | null
          region?: string | null
          show_phone_public?: boolean
          show_whatsapp_public?: boolean
          specialties?: string[]
          status?: string
          subscription_tier?: string
          updated_at?: string
          user_id?: string
          views_count?: number
          website?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      musician_shorts: {
        Row: {
          approval_status: string
          channel_name: string | null
          created_at: string
          description: string | null
          id: string
          title: string
          views_count: number
          youtube_video_id: string
        }
        Insert: {
          approval_status?: string
          channel_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title: string
          views_count?: number
          youtube_video_id: string
        }
        Update: {
          approval_status?: string
          channel_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          views_count?: number
          youtube_video_id?: string
        }
        Relationships: []
      }
      news_sources: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          rss_url: string
          site_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          rss_url: string
          site_name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          rss_url?: string
          site_name?: string
        }
        Relationships: []
      }
      newsletter_campaigns: {
        Row: {
          body_html: string
          created_at: string
          created_by: string | null
          failed_count: number
          id: string
          recipients_count: number
          scheduled_for: string | null
          segment_filters: Json
          segment_id: string | null
          sent_at: string | null
          sent_count: number
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_html: string
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          recipients_count?: number
          scheduled_for?: string | null
          segment_filters?: Json
          segment_id?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          recipients_count?: number
          scheduled_for?: string | null
          segment_filters?: Json
          segment_id?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_campaigns_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "newsletter_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_segments: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          filters: Json
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          filters?: Json
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          filters?: Json
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          followed_activity_prompt_seen: boolean
          notify_comment: boolean
          notify_follow: boolean
          notify_followed_user_activity: boolean
          notify_inquiry: boolean
          notify_like: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          followed_activity_prompt_seen?: boolean
          notify_comment?: boolean
          notify_follow?: boolean
          notify_followed_user_activity?: boolean
          notify_inquiry?: boolean
          notify_like?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          followed_activity_prompt_seen?: boolean
          notify_comment?: boolean
          notify_follow?: boolean
          notify_followed_user_activity?: boolean
          notify_inquiry?: boolean
          notify_like?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          id: string
          link: string | null
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_id: string | null
          external_payment_id: string | null
          id: string
          notes: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          product_name: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          external_payment_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          product_name: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_id?: string | null
          external_payment_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          product_name?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      organ_ui_themes: {
        Row: {
          created_at: string
          id: string
          model_id: string
          theme: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_id: string
          theme?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string
          theme?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organ_ui_themes_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: true
            referencedRelation: "keyboard_models"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_otps: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used_at: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used_at?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used_at?: string | null
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          id: number
          local_gateway_enabled: boolean
          paypal_enabled: boolean
          stripe_enabled: boolean
          test_mode: boolean
          updated_at: string
        }
        Insert: {
          id?: number
          local_gateway_enabled?: boolean
          paypal_enabled?: boolean
          stripe_enabled?: boolean
          test_mode?: boolean
          updated_at?: string
        }
        Update: {
          id?: number
          local_gateway_enabled?: boolean
          paypal_enabled?: boolean
          stripe_enabled?: boolean
          test_mode?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          created_at: string
          event_key: string
          id: string
          notes: string | null
          points: number
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_key: string
          id?: string
          notes?: string | null
          points: number
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_key?: string
          id?: string
          notes?: string | null
          points?: number
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      points_rules: {
        Row: {
          created_at: string
          daily_limit: number | null
          enabled: boolean
          event_key: string
          id: string
          label: string
          points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_limit?: number | null
          enabled?: boolean
          event_key: string
          id?: string
          label: string
          points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_limit?: number | null
          enabled?: boolean
          event_key?: string
          id?: string
          label?: string
          points?: number
          updated_at?: string
        }
        Relationships: []
      }
      points_settings: {
        Row: {
          id: number
          points_per_nis: number
          updated_at: string
        }
        Insert: {
          id?: number
          points_per_nis?: number
          updated_at?: string
        }
        Update: {
          id?: number
          points_per_nis?: number
          updated_at?: string
        }
        Relationships: []
      }
      pro_chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "pro_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_chat_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          last_message_preview: string | null
          pro_id: string
          pro_unread: number
          pro_user_id: string
          sender_id: string
          sender_unread: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          pro_id: string
          pro_unread?: number
          pro_user_id: string
          sender_id: string
          sender_unread?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          pro_id?: string
          pro_unread?: number
          pro_user_id?: string
          sender_id?: string
          sender_unread?: number
        }
        Relationships: [
          {
            foreignKeyName: "pro_chat_threads_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "music_pros"
            referencedColumns: ["id"]
          },
        ]
      }
      product_types: {
        Row: {
          attribute_schema: Json
          created_at: string
          description: string | null
          enabled: boolean
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          attribute_schema?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          attribute_schema?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profile_sync_events: {
        Row: {
          changed_fields: Json
          created_at: string
          event_type: string
          id: string
          new_values: Json | null
          old_values: Json | null
          user_id: string
        }
        Insert: {
          changed_fields?: Json
          created_at?: string
          event_type: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id: string
        }
        Update: {
          changed_fields?: Json
          created_at?: string
          event_type?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_sync_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_city: string | null
          address_street: string | null
          address_zip: string | null
          avatar_url: string | null
          banned_at: string | null
          banned_reason: string | null
          banner_url: string | null
          bio: string | null
          created_at: string
          current_status: string | null
          display_name: string | null
          email: string | null
          email_opt_in: boolean
          forum_banned_until: string | null
          forum_muted_until: string | null
          forum_post_count: number
          forum_rank: string
          forum_reputation: number
          forum_signature: string | null
          full_name: string | null
          global_status: Database["public"]["Enums"]["profile_global_status"]
          global_subscription_tier_id: string | null
          has_whatsapp: boolean
          id: string
          instagram: string | null
          is_banned: boolean
          is_public_profile_active: boolean
          keyboard_model_id: string | null
          last_login_at: string | null
          location: string | null
          organ_model: string | null
          phone: string | null
          specialties: string[] | null
          subscription_tier: string
          updated_at: string
          user_type: string
          username: string | null
          website: string | null
          youtube: string | null
        }
        Insert: {
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          current_status?: string | null
          display_name?: string | null
          email?: string | null
          email_opt_in?: boolean
          forum_banned_until?: string | null
          forum_muted_until?: string | null
          forum_post_count?: number
          forum_rank?: string
          forum_reputation?: number
          forum_signature?: string | null
          full_name?: string | null
          global_status?: Database["public"]["Enums"]["profile_global_status"]
          global_subscription_tier_id?: string | null
          has_whatsapp?: boolean
          id: string
          instagram?: string | null
          is_banned?: boolean
          is_public_profile_active?: boolean
          keyboard_model_id?: string | null
          last_login_at?: string | null
          location?: string | null
          organ_model?: string | null
          phone?: string | null
          specialties?: string[] | null
          subscription_tier?: string
          updated_at?: string
          user_type?: string
          username?: string | null
          website?: string | null
          youtube?: string | null
        }
        Update: {
          address_city?: string | null
          address_street?: string | null
          address_zip?: string | null
          avatar_url?: string | null
          banned_at?: string | null
          banned_reason?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          current_status?: string | null
          display_name?: string | null
          email?: string | null
          email_opt_in?: boolean
          forum_banned_until?: string | null
          forum_muted_until?: string | null
          forum_post_count?: number
          forum_rank?: string
          forum_reputation?: number
          forum_signature?: string | null
          full_name?: string | null
          global_status?: Database["public"]["Enums"]["profile_global_status"]
          global_subscription_tier_id?: string | null
          has_whatsapp?: boolean
          id?: string
          instagram?: string | null
          is_banned?: boolean
          is_public_profile_active?: boolean
          keyboard_model_id?: string | null
          last_login_at?: string | null
          location?: string | null
          organ_model?: string | null
          phone?: string | null
          specialties?: string[] | null
          subscription_tier?: string
          updated_at?: string
          user_type?: string
          username?: string | null
          website?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_global_subscription_tier_id_fkey"
            columns: ["global_subscription_tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      rhythm_automation_settings: {
        Row: {
          enabled: boolean
          id: number
          updated_at: string
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          enabled?: boolean
          id?: number
          updated_at?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          enabled?: boolean
          id?: number
          updated_at?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      rhythm_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          set_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          set_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          set_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "rhythm_folders_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "rhythm_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      rhythm_item_favorites: {
        Row: {
          created_at: string
          id: string
          rhythm_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rhythm_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rhythm_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rhythm_item_favorites_rhythm_item_id_fkey"
            columns: ["rhythm_item_id"]
            isOneToOne: false
            referencedRelation: "rhythm_items"
            referencedColumns: ["id"]
          },
        ]
      }
      rhythm_items: {
        Row: {
          created_at: string
          description: string | null
          folder_id: string
          id: string
          likes_count: number
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          folder_id: string
          id?: string
          likes_count?: number
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          folder_id?: string
          id?: string
          likes_count?: number
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "rhythm_items_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "rhythm_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      rhythm_orders: {
        Row: {
          admin_notes: string | null
          completed_at: string | null
          cpi_file_path: string | null
          cpi_file_url: string | null
          created_at: string
          customer_email: string | null
          id: string
          info_file_path: string | null
          info_file_url: string | null
          keyboard_model_id: string | null
          price: number
          rhythm_set_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          completed_at?: string | null
          cpi_file_path?: string | null
          cpi_file_url?: string | null
          created_at?: string
          customer_email?: string | null
          id?: string
          info_file_path?: string | null
          info_file_url?: string | null
          keyboard_model_id?: string | null
          price?: number
          rhythm_set_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          completed_at?: string | null
          cpi_file_path?: string | null
          cpi_file_url?: string | null
          created_at?: string
          customer_email?: string | null
          id?: string
          info_file_path?: string | null
          info_file_url?: string | null
          keyboard_model_id?: string | null
          price?: number
          rhythm_set_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rhythm_orders_keyboard_model_id_fkey"
            columns: ["keyboard_model_id"]
            isOneToOne: false
            referencedRelation: "keyboard_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rhythm_orders_rhythm_set_id_fkey"
            columns: ["rhythm_set_id"]
            isOneToOne: false
            referencedRelation: "rhythm_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      rhythm_sets: {
        Row: {
          brand_id: string
          cover_image_url: string | null
          created_at: string
          creator_name: string
          description: string | null
          id: string
          info_file_extension: string | null
          is_automated: boolean
          price: number
          requires_info_file: boolean
          set_name: string
          video_source_type: string
          video_url: string | null
          youtube_video_id: string | null
        }
        Insert: {
          brand_id: string
          cover_image_url?: string | null
          created_at?: string
          creator_name: string
          description?: string | null
          id?: string
          info_file_extension?: string | null
          is_automated?: boolean
          price?: number
          requires_info_file?: boolean
          set_name: string
          video_source_type?: string
          video_url?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          brand_id?: string
          cover_image_url?: string | null
          created_at?: string
          creator_name?: string
          description?: string | null
          id?: string
          info_file_extension?: string | null
          is_automated?: boolean
          price?: number
          requires_info_file?: boolean
          set_name?: string
          video_source_type?: string
          video_url?: string | null
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rhythm_sets_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          actor_id: string | null
          created_at: string
          details: Json
          event_type: string
          id: string
          target_kind: string | null
          target_ref: string | null
          target_user_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          target_kind?: string | null
          target_ref?: string | null
          target_user_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          target_kind?: string | null
          target_ref?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      service_pricing: {
        Row: {
          is_active: boolean
          label: string
          price: number
          service_key: string
          updated_at: string
        }
        Insert: {
          is_active?: boolean
          label: string
          price?: number
          service_key: string
          updated_at?: string
        }
        Update: {
          is_active?: boolean
          label?: string
          price?: number
          service_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      set_audio_samples: {
        Row: {
          audio_url: string
          button_type: string
          created_at: string
          id: string
          rhythm_item_id: string | null
          set_id: string
        }
        Insert: {
          audio_url: string
          button_type: string
          created_at?: string
          id?: string
          rhythm_item_id?: string | null
          set_id: string
        }
        Update: {
          audio_url?: string
          button_type?: string
          created_at?: string
          id?: string
          rhythm_item_id?: string | null
          set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_audio_samples_rhythm_item_id_fkey"
            columns: ["rhythm_item_id"]
            isOneToOne: false
            referencedRelation: "rhythm_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_audio_samples_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "rhythm_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_bundle_items: {
        Row: {
          bundle_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
        }
        Insert: {
          bundle_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
        }
        Update: {
          bundle_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "shop_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_bundle_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_bundles: {
        Row: {
          created_at: string
          description: string | null
          discount_type: Database["public"]["Enums"]["shop_coupon_type"]
          discount_value: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["shop_coupon_type"]
          discount_value?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["shop_coupon_type"]
          discount_value?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      shop_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          label: string
          parent_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          label: string
          parent_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          label?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_coupons: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          description: string | null
          discount_type: Database["public"]["Enums"]["shop_coupon_type"]
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number
          starts_at: string
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: Database["public"]["Enums"]["shop_coupon_type"]
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number
          starts_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: Database["public"]["Enums"]["shop_coupon_type"]
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number
          starts_at?: string
        }
        Relationships: []
      }
      shop_custom_fields: {
        Row: {
          category_id: string | null
          created_at: string
          display_order: number
          field_key: string
          field_label: string
          field_type: Database["public"]["Enums"]["shop_field_type"]
          id: string
          is_required: boolean
          options: Json
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          display_order?: number
          field_key: string
          field_label: string
          field_type?: Database["public"]["Enums"]["shop_field_type"]
          id?: string
          is_required?: boolean
          options?: Json
        }
        Update: {
          category_id?: string | null
          created_at?: string
          display_order?: number
          field_key?: string
          field_label?: string
          field_type?: Database["public"]["Enums"]["shop_field_type"]
          id?: string
          is_required?: boolean
          options?: Json
        }
        Relationships: [
          {
            foreignKeyName: "shop_custom_fields_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_digital_downloads: {
        Row: {
          created_at: string
          customer_id: string | null
          download_count: number
          download_token: string
          expires_at: string | null
          id: string
          last_downloaded_at: string | null
          max_downloads: number
          order_id: string
          order_item_id: string
          product_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          download_count?: number
          download_token: string
          expires_at?: string | null
          id?: string
          last_downloaded_at?: string | null
          max_downloads?: number
          order_id: string
          order_item_id: string
          product_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          download_count?: number
          download_token?: string
          expires_at?: string | null
          id?: string
          last_downloaded_at?: string | null
          max_downloads?: number
          order_id?: string
          order_item_id?: string
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_digital_downloads_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_digital_downloads_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "shop_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_digital_downloads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_order_history: {
        Row: {
          action: string
          admin_id: string | null
          amount: number | null
          created_at: string
          id: string
          metadata: Json
          order_id: string
          reason: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          amount?: number | null
          created_at?: string
          id?: string
          metadata?: Json
          order_id: string
          reason?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          amount?: number | null
          created_at?: string
          id?: string
          metadata?: Json
          order_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_order_items: {
        Row: {
          created_at: string
          fulfillment_kind: string | null
          fulfillment_ref_id: string | null
          id: string
          order_id: string
          product_id: string | null
          product_sku: string | null
          product_title: string
          product_type: Database["public"]["Enums"]["shop_product_type"]
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          fulfillment_kind?: string | null
          fulfillment_ref_id?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          product_sku?: string | null
          product_title: string
          product_type?: Database["public"]["Enums"]["shop_product_type"]
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          fulfillment_kind?: string | null
          fulfillment_ref_id?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_sku?: string | null
          product_title?: string
          product_type?: Database["public"]["Enums"]["shop_product_type"]
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          admin_notes: string | null
          coupon_code: string | null
          cpi_status: string
          created_at: string
          currency: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          discount_amount: number
          external_payment_id: string | null
          id: string
          info_file_name: string | null
          info_file_url: string | null
          notes: string | null
          order_number: string
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["shop_payment_status"]
          points_discount_amount: number
          points_redeemed: number
          shipping_address: Json | null
          shipping_amount: number
          shipping_carrier: string | null
          status: Database["public"]["Enums"]["shop_order_status"]
          subtotal: number
          tax_amount: number
          total_amount: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          coupon_code?: string | null
          cpi_status?: string
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number
          external_payment_id?: string | null
          id?: string
          info_file_name?: string | null
          info_file_url?: string | null
          notes?: string | null
          order_number: string
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["shop_payment_status"]
          points_discount_amount?: number
          points_redeemed?: number
          shipping_address?: Json | null
          shipping_amount?: number
          shipping_carrier?: string | null
          status?: Database["public"]["Enums"]["shop_order_status"]
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          coupon_code?: string | null
          cpi_status?: string
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number
          external_payment_id?: string | null
          id?: string
          info_file_name?: string | null
          info_file_url?: string | null
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["shop_payment_status"]
          points_discount_amount?: number
          points_redeemed?: number
          shipping_address?: Json | null
          shipping_amount?: number
          shipping_carrier?: string | null
          status?: Database["public"]["Enums"]["shop_order_status"]
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shop_product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_primary: boolean
          product_id: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_primary?: boolean
          product_id: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_primary?: boolean
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          asker_id: string | null
          asker_name: string | null
          created_at: string
          id: string
          is_approved: boolean
          product_id: string
          question: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asker_id?: string | null
          asker_name?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id: string
          question: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asker_id?: string | null
          asker_name?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_questions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_reviews: {
        Row: {
          content: string | null
          created_at: string
          id: string
          images: string[]
          is_approved: boolean
          is_verified_purchase: boolean
          order_id: string | null
          product_id: string
          rating: number
          reviewer_id: string
          title: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          images?: string[]
          is_approved?: boolean
          is_verified_purchase?: boolean
          order_id?: string | null
          product_id: string
          rating: number
          reviewer_id: string
          title?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          images?: string[]
          is_approved?: boolean
          is_verified_purchase?: boolean
          order_id?: string | null
          product_id?: string
          rating?: number
          reviewer_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          audio_demo_url: string | null
          brand: string | null
          category_id: string | null
          cost_price: number | null
          created_at: string
          currency: string
          current_version: string | null
          custom_fields: Json
          description: string | null
          digital_file_name: string | null
          digital_file_size_mb: number | null
          digital_file_url: string | null
          dimensions: Json | null
          download_expiry_days: number
          download_limit: number
          fulfillment_type: Database["public"]["Enums"]["shop_fulfillment_type"]
          id: string
          is_featured: boolean
          low_stock_threshold: number
          main_image: string | null
          manage_stock: boolean
          meta_description: string | null
          meta_title: string | null
          model: string | null
          price: number
          product_type: Database["public"]["Enums"]["shop_product_type"]
          sale_price: number | null
          sales_count: number
          short_description: string | null
          sku: string | null
          slug: string
          status: Database["public"]["Enums"]["shop_product_status"]
          status_tags: string[]
          stock_quantity: number
          title: string
          updated_at: string
          vendor_id: string | null
          video_demo_url: string | null
          views_count: number
          warranty_terms: string | null
          weight_kg: number | null
        }
        Insert: {
          audio_demo_url?: string | null
          brand?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          currency?: string
          current_version?: string | null
          custom_fields?: Json
          description?: string | null
          digital_file_name?: string | null
          digital_file_size_mb?: number | null
          digital_file_url?: string | null
          dimensions?: Json | null
          download_expiry_days?: number
          download_limit?: number
          fulfillment_type?: Database["public"]["Enums"]["shop_fulfillment_type"]
          id?: string
          is_featured?: boolean
          low_stock_threshold?: number
          main_image?: string | null
          manage_stock?: boolean
          meta_description?: string | null
          meta_title?: string | null
          model?: string | null
          price?: number
          product_type?: Database["public"]["Enums"]["shop_product_type"]
          sale_price?: number | null
          sales_count?: number
          short_description?: string | null
          sku?: string | null
          slug: string
          status?: Database["public"]["Enums"]["shop_product_status"]
          status_tags?: string[]
          stock_quantity?: number
          title: string
          updated_at?: string
          vendor_id?: string | null
          video_demo_url?: string | null
          views_count?: number
          warranty_terms?: string | null
          weight_kg?: number | null
        }
        Update: {
          audio_demo_url?: string | null
          brand?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          currency?: string
          current_version?: string | null
          custom_fields?: Json
          description?: string | null
          digital_file_name?: string | null
          digital_file_size_mb?: number | null
          digital_file_url?: string | null
          dimensions?: Json | null
          download_expiry_days?: number
          download_limit?: number
          fulfillment_type?: Database["public"]["Enums"]["shop_fulfillment_type"]
          id?: string
          is_featured?: boolean
          low_stock_threshold?: number
          main_image?: string | null
          manage_stock?: boolean
          meta_description?: string | null
          meta_title?: string | null
          model?: string | null
          price?: number
          product_type?: Database["public"]["Enums"]["shop_product_type"]
          sale_price?: number | null
          sales_count?: number
          short_description?: string | null
          sku?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["shop_product_status"]
          status_tags?: string[]
          stock_quantity?: number
          title?: string
          updated_at?: string
          vendor_id?: string | null
          video_demo_url?: string | null
          views_count?: number
          warranty_terms?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "shop_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_settings: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          default_currency: string
          default_shipping_cost: number
          free_shipping_threshold: number
          id: number
          store_name: string
          updated_at: string
          vat_percentage: number
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          default_currency?: string
          default_shipping_cost?: number
          free_shipping_threshold?: number
          id?: number
          store_name?: string
          updated_at?: string
          vat_percentage?: number
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          default_currency?: string
          default_shipping_cost?: number
          free_shipping_threshold?: number
          id?: number
          store_name?: string
          updated_at?: string
          vat_percentage?: number
        }
        Relationships: []
      }
      shop_trade_in_requests: {
        Row: {
          admin_notes: string | null
          admin_offer: number | null
          asking_price: number | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string
          id: string
          images: string[]
          item_brand: string | null
          item_condition: string | null
          item_description: string | null
          item_model: string | null
          item_year: string | null
          related_product_id: string | null
          status: Database["public"]["Enums"]["shop_trade_in_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          admin_offer?: number | null
          asking_price?: number | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          images?: string[]
          item_brand?: string | null
          item_condition?: string | null
          item_description?: string | null
          item_model?: string | null
          item_year?: string | null
          related_product_id?: string | null
          status?: Database["public"]["Enums"]["shop_trade_in_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          admin_offer?: number | null
          asking_price?: number | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          images?: string[]
          item_brand?: string | null
          item_condition?: string | null
          item_description?: string | null
          item_model?: string | null
          item_year?: string | null
          related_product_id?: string | null
          status?: Database["public"]["Enums"]["shop_trade_in_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_trade_in_requests_related_product_id_fkey"
            columns: ["related_product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_trade_in_settings: {
        Row: {
          id: number
          intro_text: string | null
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          id?: number
          intro_text?: string | null
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          id?: number
          intro_text?: string | null
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      shop_vendors: {
        Row: {
          address: string | null
          company_name: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          notes: string | null
          payment_notes: string | null
          phone: string | null
          updated_at: string
          vendor_type: Database["public"]["Enums"]["shop_vendor_type"]
        }
        Insert: {
          address?: string | null
          company_name: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          payment_notes?: string | null
          phone?: string | null
          updated_at?: string
          vendor_type?: Database["public"]["Enums"]["shop_vendor_type"]
        }
        Update: {
          address?: string | null
          company_name?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          payment_notes?: string | null
          phone?: string | null
          updated_at?: string
          vendor_type?: Database["public"]["Enums"]["shop_vendor_type"]
        }
        Relationships: []
      }
      shop_wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shorts_analytics_logs: {
        Row: {
          buffered_seconds: number | null
          created_at: string | null
          device_type: string | null
          id: string
          is_completed: boolean | null
          max_seconds_reached: number
          rewatch_count: number | null
          seconds_watched: number
          session_id: string
          user_id: string | null
          video_id: string
        }
        Insert: {
          buffered_seconds?: number | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          is_completed?: boolean | null
          max_seconds_reached?: number
          rewatch_count?: number | null
          seconds_watched?: number
          session_id: string
          user_id?: string | null
          video_id: string
        }
        Update: {
          buffered_seconds?: number | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          is_completed?: boolean | null
          max_seconds_reached?: number
          rewatch_count?: number | null
          seconds_watched?: number
          session_id?: string
          user_id?: string | null
          video_id?: string
        }
        Relationships: []
      }
      shorts_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          video_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          video_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          video_id?: string
        }
        Relationships: []
      }
      shorts_settings: {
        Row: {
          auto_approve_all: boolean
          id: number
          require_approval: boolean
          updated_at: string
        }
        Insert: {
          auto_approve_all?: boolean
          id?: number
          require_approval?: boolean
          updated_at?: string
        }
        Update: {
          auto_approve_all?: boolean
          id?: number
          require_approval?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      shorts_sources: {
        Row: {
          channel_id: string
          channel_name: string
          created_at: string
          id: string
          is_active: boolean
        }
        Insert: {
          channel_id: string
          channel_name: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Update: {
          channel_id?: string
          channel_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      shorts_trusted_uploaders: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      shorts_video_views: {
        Row: {
          id: string
          user_id: string | null
          video_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          video_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          video_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shorts_video_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "shorts_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      shorts_videos: {
        Row: {
          admin_notes: string | null
          audio_bitrate: number | null
          course_link: string | null
          created_at: string
          creator_id: string
          description: string | null
          duration_seconds: number | null
          external_streaming_links: Json | null
          hls_playlist_url: string | null
          id: string
          is_hi_res: boolean | null
          is_premium: boolean
          lyrics_offset: number | null
          lyrics_url: string | null
          marketplace_listing_id: string | null
          product_id: string | null
          published_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          scheduled_at: string | null
          scheduled_for: string | null
          status: string
          tags: string[]
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
          video_url_360p: string | null
          video_url_720p: string | null
          views_count: number
        }
        Insert: {
          admin_notes?: string | null
          audio_bitrate?: number | null
          course_link?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          duration_seconds?: number | null
          external_streaming_links?: Json | null
          hls_playlist_url?: string | null
          id?: string
          is_hi_res?: boolean | null
          is_premium?: boolean
          lyrics_offset?: number | null
          lyrics_url?: string | null
          marketplace_listing_id?: string | null
          product_id?: string | null
          published_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_at?: string | null
          scheduled_for?: string | null
          status?: string
          tags?: string[]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
          video_url_360p?: string | null
          video_url_720p?: string | null
          views_count?: number
        }
        Update: {
          admin_notes?: string | null
          audio_bitrate?: number | null
          course_link?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          duration_seconds?: number | null
          external_streaming_links?: Json | null
          hls_playlist_url?: string | null
          id?: string
          is_hi_res?: boolean | null
          is_premium?: boolean
          lyrics_offset?: number | null
          lyrics_url?: string | null
          marketplace_listing_id?: string | null
          product_id?: string | null
          published_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scheduled_at?: string | null
          scheduled_for?: string | null
          status?: string
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
          video_url_360p?: string | null
          video_url_720p?: string | null
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "shorts_videos_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_tiers: {
        Row: {
          academy_discount_percent: number
          beat_access: boolean
          color: string | null
          created_at: string
          description: string | null
          discount_percent: number
          id: string
          is_vip: boolean
          marketplace_free_boosts: number
          name: string
          rank: number
          shop_discount_percent: number
          slug: string
          updated_at: string
        }
        Insert: {
          academy_discount_percent?: number
          beat_access?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          discount_percent?: number
          id?: string
          is_vip?: boolean
          marketplace_free_boosts?: number
          name: string
          rank?: number
          shop_discount_percent?: number
          slug: string
          updated_at?: string
        }
        Update: {
          academy_discount_percent?: number
          beat_access?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          discount_percent?: number
          id?: string
          is_vip?: boolean
          marketplace_free_boosts?: number
          name?: string
          rank?: number
          shop_discount_percent?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplier_orders: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          expected_delivery_date: string | null
          id: string
          items: Json
          notes: string | null
          order_date: string
          order_number: string | null
          status: Database["public"]["Enums"]["supplier_order_status"]
          supplier_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          expected_delivery_date?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_date?: string
          order_number?: string | null
          status?: Database["public"]["Enums"]["supplier_order_status"]
          supplier_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          expected_delivery_date?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_date?: string
          order_number?: string | null
          status?: Database["public"]["Enums"]["supplier_order_status"]
          supplier_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          category: Database["public"]["Enums"]["supplier_category"]
          company_name: string
          contact_name: string | null
          created_at: string
          custom_category: string | null
          email: string | null
          id: string
          is_active: boolean
          payment_notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["supplier_category"]
          company_name: string
          contact_name?: string | null
          created_at?: string
          custom_category?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          payment_notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["supplier_category"]
          company_name?: string
          contact_name?: string | null
          created_at?: string
          custom_category?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          payment_notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
          user_id: string | null
          user_type: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
          user_type?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
          user_type?: string | null
        }
        Relationships: []
      }
      user_device_sessions: {
        Row: {
          created_at: string
          device_id: string
          id: string
          last_seen_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          last_seen_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          last_seen_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          id: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          id?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      user_likes: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_points: {
        Row: {
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
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
      wiki_articles: {
        Row: {
          approval_status: string
          category: string
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          image_url: string | null
          is_verified: boolean | null
          last_edited_by: string | null
          related_gear_keywords: string[] | null
          related_product_id: string | null
          slug: string
          summary: string | null
          title: string
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          approval_status?: string
          category: string
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_verified?: boolean | null
          last_edited_by?: string | null
          related_gear_keywords?: string[] | null
          related_product_id?: string | null
          slug: string
          summary?: string | null
          title: string
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          approval_status?: string
          category?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_verified?: boolean | null
          last_edited_by?: string | null
          related_gear_keywords?: string[] | null
          related_product_id?: string | null
          slug?: string
          summary?: string | null
          title?: string
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wiki_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_articles_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_articles_related_product_id_fkey"
            columns: ["related_product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_revisions: {
        Row: {
          article_id: string
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string | null
          suggested_html: string
          suggested_summary: string | null
          suggested_title: string | null
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          suggested_html: string
          suggested_summary?: string | null
          suggested_title?: string | null
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          suggested_html?: string
          suggested_summary?: string | null
          suggested_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wiki_revisions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "wiki_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_revisions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wiki_revisions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_user_points: {
        Args: { _delta: number; _reason: string; _user_id: string }
        Returns: {
          new_balance: number
        }[]
      }
      admin_assign_role_by_email: {
        Args: {
          _email: string
          _revoke?: boolean
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      admin_broadcast_notification: {
        Args: {
          p_link: string
          p_message: string
          p_target_group: string
          p_title: string
        }
        Returns: {
          broadcast_id: string
          recipient_count: number
        }[]
      }
      admin_grant_course_access_by_email: {
        Args: { _course_id: string; _email: string }
        Returns: string
      }
      admin_list_admins: {
        Args: never
        Returns: {
          email: string
          granted_at: string
          user_id: string
        }[]
      }
      admin_list_users: {
        Args: { _limit?: number; _offset?: number; _search?: string }
        Returns: {
          avatar_url: string
          banned_at: string
          banned_reason: string
          created_at: string
          display_name: string
          email: string
          id: string
          is_banned: boolean
          roles: string[]
          subscription_tier: string
          username: string
        }[]
      }
      admin_refund_shop_order: {
        Args: {
          p_amount?: number
          p_full_refund?: boolean
          p_order_id: string
          p_reason: string
        }
        Returns: Json
      }
      admin_retrigger_cpi_webhook: {
        Args: { p_rhythm_order_id: string }
        Returns: Json
      }
      admin_set_affiliate_conversion_status: {
        Args: { p_conversion_id: string; p_status: string }
        Returns: undefined
      }
      admin_set_user_ban: {
        Args: { _banned: boolean; _reason?: string; _user_id: string }
        Returns: undefined
      }
      admin_set_user_global_tier: {
        Args: { _tier_id: string; _user_id: string }
        Returns: Json
      }
      admin_set_user_role: {
        Args: {
          _revoke?: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: string
      }
      admin_set_wiki_approval: {
        Args: { _article_id: string; _reason?: string; _status: string }
        Returns: undefined
      }
      affiliate_approve_application: {
        Args: { _app_id: string }
        Returns: string
      }
      assign_user_tag: {
        Args: {
          _category?: string
          _color?: string
          _tag: string
          _user_id: string
        }
        Returns: string
      }
      award_booking_points: { Args: { p_inquiry_id: string }; Returns: number }
      award_points_for_event: {
        Args: {
          _event_key: string
          _notes?: string
          _reference_id?: string
          _reference_type?: string
          _user_id: string
        }
        Returns: number
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_ref_code: { Args: never; Returns: string }
      get_lesson_media: {
        Args: { _lesson_id: string }
        Returns: {
          authorized: boolean
          duration_seconds: number
          lesson_id: string
          video_path: string
          video_provider: string
          video_url: string
        }[]
      }
      get_listing_contact: {
        Args: { _listing_id: string }
        Returns: {
          phone: string
          whatsapp: string
        }[]
      }
      get_listing_stats: {
        Args: { _listing_id: string }
        Returns: {
          event_type: string
          total: number
        }[]
      }
      get_notif_pref: {
        Args: { _kind: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_listing_views: {
        Args: { _listing_id: string }
        Returns: undefined
      }
      increment_pro_views: { Args: { _pro_id: string }; Returns: undefined }
      increment_short_views: { Args: { _video_id: string }; Returns: undefined }
      is_user_banned: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      process_abandoned_carts: { Args: never; Returns: number }
      process_order_fulfillment: {
        Args: { _order_id: string }
        Returns: undefined
      }
      process_pending_newsletter_campaigns: { Args: never; Returns: number }
      process_received_purchase_order: {
        Args: { p_order_id: string }
        Returns: number
      }
      publish_scheduled_shorts: { Args: never; Returns: number }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reconcile_points_balance: { Args: never; Returns: Json }
      record_affiliate_conversion:
        | {
            Args: {
              _notes?: string
              _order_amount: number
              _ref_code: string
              _scope_id: string
              _scope_type: string
              _user_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              _notes?: string
              _order_amount: number
              _order_id?: string
              _ref_code: string
              _scope_id: string
              _scope_type: string
              _user_id?: string
            }
            Returns: string
          }
      redeem_academy_access_code: { Args: { _code: string }; Returns: string }
      redeem_points_for_order: {
        Args: { _order_id: string; _points: number }
        Returns: number
      }
      register_device: {
        Args: { _device_id: string; _user_agent: string }
        Returns: boolean
      }
      remove_user_tag: {
        Args: { _tag: string; _user_id: string }
        Returns: undefined
      }
      track_banner_event: {
        Args: { _banner_id: string; _event_type: string }
        Returns: undefined
      }
      track_listing_event: {
        Args: { _event_type: string; _listing_id: string }
        Returns: undefined
      }
      update_crm_status: {
        Args: { p_inquiry_id: string; p_new_status: string }
        Returns: Json
      }
      update_pro_inquiry_and_crm_status: {
        Args: { p_inquiry_id: string; p_new_status: string }
        Returns: Json
      }
      user_can_access_lesson: { Args: { _lesson_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "content_editor"
        | "finance"
        | "support"
        | "member"
        | "premium"
        | "vip"
        | "chat_oversight"
      automation_action: "send_email" | "open_whatsapp" | "create_task"
      automation_trigger:
        | "lead_status_changed"
        | "order_paid"
        | "subscription_expiring"
        | "supplier_order_status_changed"
        | "new_lead_created"
      email_status: "queued" | "sent" | "failed" | "bounced"
      interaction_type:
        | "note"
        | "call"
        | "email"
        | "meeting"
        | "purchase"
        | "lesson"
        | "signup"
        | "other"
      lead_source:
        | "website"
        | "whatsapp"
        | "facebook"
        | "phone"
        | "referral"
        | "other"
        | "music_pro_inquiry"
      lead_status: "new" | "in_progress" | "converted" | "lost"
      payment_status: "pending" | "paid" | "cancelled" | "refunded"
      profile_global_status: "active" | "suspended" | "banned" | "pending"
      shop_coupon_type: "percent" | "fixed"
      shop_field_type:
        | "text"
        | "number"
        | "select"
        | "multiselect"
        | "boolean"
        | "textarea"
      shop_fulfillment_type: "in_stock" | "dropship"
      shop_order_status:
        | "pending"
        | "paid"
        | "processing"
        | "shipped"
        | "completed"
        | "cancelled"
        | "refunded"
      shop_payment_status: "pending" | "paid" | "failed" | "refunded"
      shop_product_status: "draft" | "active" | "archived"
      shop_product_type: "physical" | "digital" | "hybrid"
      shop_trade_in_status:
        | "new"
        | "reviewing"
        | "offered"
        | "accepted"
        | "rejected"
        | "completed"
      shop_vendor_type: "in_house" | "dropship"
      supplier_category: "rhythms" | "equipment" | "courses" | "other"
      supplier_order_status:
        | "draft"
        | "sent"
        | "received"
        | "paid"
        | "cancelled"
      task_priority: "low" | "normal" | "high" | "urgent"
      task_status: "open" | "in_progress" | "done"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "content_editor",
        "finance",
        "support",
        "member",
        "premium",
        "vip",
        "chat_oversight",
      ],
      automation_action: ["send_email", "open_whatsapp", "create_task"],
      automation_trigger: [
        "lead_status_changed",
        "order_paid",
        "subscription_expiring",
        "supplier_order_status_changed",
        "new_lead_created",
      ],
      email_status: ["queued", "sent", "failed", "bounced"],
      interaction_type: [
        "note",
        "call",
        "email",
        "meeting",
        "purchase",
        "lesson",
        "signup",
        "other",
      ],
      lead_source: [
        "website",
        "whatsapp",
        "facebook",
        "phone",
        "referral",
        "other",
        "music_pro_inquiry",
      ],
      lead_status: ["new", "in_progress", "converted", "lost"],
      payment_status: ["pending", "paid", "cancelled", "refunded"],
      profile_global_status: ["active", "suspended", "banned", "pending"],
      shop_coupon_type: ["percent", "fixed"],
      shop_field_type: [
        "text",
        "number",
        "select",
        "multiselect",
        "boolean",
        "textarea",
      ],
      shop_fulfillment_type: ["in_stock", "dropship"],
      shop_order_status: [
        "pending",
        "paid",
        "processing",
        "shipped",
        "completed",
        "cancelled",
        "refunded",
      ],
      shop_payment_status: ["pending", "paid", "failed", "refunded"],
      shop_product_status: ["draft", "active", "archived"],
      shop_product_type: ["physical", "digital", "hybrid"],
      shop_trade_in_status: [
        "new",
        "reviewing",
        "offered",
        "accepted",
        "rejected",
        "completed",
      ],
      shop_vendor_type: ["in_house", "dropship"],
      supplier_category: ["rhythms", "equipment", "courses", "other"],
      supplier_order_status: ["draft", "sent", "received", "paid", "cancelled"],
      task_priority: ["low", "normal", "high", "urgent"],
      task_status: ["open", "in_progress", "done"],
    },
  },
} as const
