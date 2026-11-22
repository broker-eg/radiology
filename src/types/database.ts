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
      apps: {
        Row: {
          badge: string | null
          category: string
          cover_path: string | null
          created_at: string
          description: string
          duplicate_of: string | null
          external_url: string | null
          html_path: string | null
          id: string
          kind: string
          modality: string
          name: string
          sort_order: number
          status: string
          tier: string
          updated_at: string
        }
        Insert: {
          badge?: string | null
          category: string
          cover_path?: string | null
          created_at?: string
          description?: string
          duplicate_of?: string | null
          external_url?: string | null
          html_path?: string | null
          id?: string
          kind: string
          modality?: string
          name: string
          sort_order?: number
          status?: string
          tier?: string
          updated_at?: string
        }
        Update: {
          badge?: string | null
          category?: string
          cover_path?: string | null
          created_at?: string
          description?: string
          duplicate_of?: string | null
          external_url?: string | null
          html_path?: string | null
          id?: string
          kind?: string
          modality?: string
          name?: string
          sort_order?: number
          status?: string
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apps_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["name"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          icon: string
          name: string
          sort_order: number
          subtitle: string
        }
        Insert: {
          color?: string
          icon?: string
          name: string
          sort_order?: number
          subtitle?: string
        }
        Update: {
          color?: string
          icon?: string
          name?: string
          sort_order?: number
          subtitle?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          app_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          user_id?: string
        }
        Update: {
          app_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          hero_app_id: string | null
          id: string
          onboarded_at: string | null
          plan: string
          plan_changed_at: string | null
          role: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string | null
          hero_app_id?: string | null
          id: string
          onboarded_at?: string | null
          plan?: string
          plan_changed_at?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          hero_app_id?: string | null
          id?: string
          onboarded_at?: string | null
          plan?: string
          plan_changed_at?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_hero_app_id_fkey"
            columns: ["hero_app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_user: { Args: { target_user: string }; Returns: undefined }
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          favorites_count: number
          full_name: string
          id: string
          last_sign_in_at: string
          plan: string
          plan_changed_at: string
          role: string
        }[]
      }
      admin_set_plan: {
        Args: { new_plan: string; target_user: string }
        Returns: undefined
      }
      admin_set_role: {
        Args: { new_role: string; target_user: string }
        Returns: undefined
      }
      has_pro_access: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  TableName extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][TableName]["Row"]

export type TablesInsert<
  TableName extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][TableName]["Insert"]

export type TablesUpdate<
  TableName extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][TableName]["Update"]
