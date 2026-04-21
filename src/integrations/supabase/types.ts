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
      customer_interactions: {
        Row: {
          created_at: string
          created_by: string | null
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
      suppliers: {
        Row: {
          category: Database["public"]["Enums"]["supplier_category"]
          company_name: string
          contact_name: string | null
          created_at: string
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
          email?: string | null
          id?: string
          is_active?: boolean
          payment_notes?: string | null
          phone?: string | null
          updated_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      task_priority: ["low", "normal", "high", "urgent"],
      task_status: ["open", "in_progress", "done"],
    },
  },
} as const
