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
          related_lead_id: string | null
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
          related_lead_id?: string | null
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
          related_lead_id?: string | null
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
          color: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          tag: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          tag: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          tag?: string
        }
        Relationships: []
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
      forum_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
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
      forum_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "forum_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_comments_post_id_fkey"
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
          category_id: string
          content: string
          created_at: string
          id: string
          is_locked: boolean
          is_pinned: boolean
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          author_id: string
          category_id: string
          content: string
          created_at?: string
          id?: string
          is_locked?: boolean
          is_pinned?: boolean
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          author_id?: string
          category_id?: string
          content?: string
          created_at?: string
          id?: string
          is_locked?: boolean
          is_pinned?: boolean
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          created_at: string
          custom_source: string | null
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
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: []
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
      marketplace_listings: {
        Row: {
          admin_notes: string | null
          audio_url: string | null
          brand: string | null
          bump_expires_at: string | null
          bumped_at: string | null
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
          is_urgent: boolean
          item_condition: string
          model: string | null
          phone: string | null
          price: number
          region: string | null
          seller_id: string
          seller_type: string
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
          is_urgent?: boolean
          item_condition?: string
          model?: string | null
          phone?: string | null
          price?: number
          region?: string | null
          seller_id: string
          seller_type?: string
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
          is_urgent?: boolean
          item_condition?: string
          model?: string | null
          phone?: string | null
          price?: number
          region?: string | null
          seller_id?: string
          seller_type?: string
          specs?: Json | null
          status?: string
          subcategory?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
          views_count?: number
          whatsapp?: string | null
        }
        Relationships: []
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
          listing_id: string | null
          rating: number
          reviewer_id: string
          seller_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          rating: number
          reviewer_id: string
          seller_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          instagram: string | null
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
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          instagram?: string | null
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
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          instagram?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_assign_role_by_email: {
        Args: {
          _email: string
          _revoke?: boolean
          _role: Database["public"]["Enums"]["app_role"]
        }
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      track_banner_event: {
        Args: { _banner_id: string; _event_type: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      lead_status: "new" | "in_progress" | "converted" | "lost"
      payment_status: "pending" | "paid" | "cancelled" | "refunded"
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
      app_role: ["admin", "moderator", "user"],
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
      ],
      lead_status: ["new", "in_progress", "converted", "lost"],
      payment_status: ["pending", "paid", "cancelled", "refunded"],
      supplier_category: ["rhythms", "equipment", "courses", "other"],
      supplier_order_status: ["draft", "sent", "received", "paid", "cancelled"],
      task_priority: ["low", "normal", "high", "urgent"],
      task_status: ["open", "in_progress", "done"],
    },
  },
} as const
