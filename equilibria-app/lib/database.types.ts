export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      absences: {
        Row: {
          class_date: string
          created_at: string | null
          id: string
          slot_id: string
          user_id: string
        }
        Insert: {
          class_date: string
          created_at?: string | null
          id?: string
          slot_id: string
          user_id: string
        }
        Update: {
          class_date?: string
          created_at?: string | null
          id?: string
          slot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "absences_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "schedule_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          emoji: string
          expires_at: string | null
          id: string
          is_active: boolean
          pinned: boolean
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          emoji?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          pinned?: boolean
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          emoji?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          pinned?: boolean
          title?: string
        }
        Relationships: []
      }
      cancelled_classes: {
        Row: {
          class_date: string
          created_at: string | null
          created_by: string | null
          id: string
          reason: string | null
          slot_id: string
        }
        Insert: {
          class_date: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          reason?: string | null
          slot_id: string
        }
        Update: {
          class_date?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          reason?: string | null
          slot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancelled_classes_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "schedule_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      class_types: {
        Row: { color: string; id: string; name: string }
        Insert: { color: string; id: string; name: string }
        Update: { color?: string; id?: string; name?: string }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string | null
          full_name: string
          id: string
          is_used: boolean
          phone: string | null
          plan_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          full_name: string
          id?: string
          is_used?: boolean
          phone?: string | null
          plan_id?: string
        }
        Update: {
          code?: string
          created_at?: string | null
          full_name?: string
          id?: string
          is_used?: boolean
          phone?: string | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          classes_per_week: number
          id: string
          max_recoveries_per_month: number
          name: string
        }
        Insert: {
          classes_per_week: number
          id: string
          max_recoveries_per_month: number
          name: string
        }
        Update: {
          classes_per_week?: number
          id?: string
          max_recoveries_per_month?: number
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_admin: boolean
          last_payment_date: string | null
          notes: string | null
          payment_status: string
          phone: string | null
          plan_id: string | null
          schedule_type: string
          username: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          is_admin?: boolean
          last_payment_date?: string | null
          notes?: string | null
          payment_status?: string
          phone?: string | null
          plan_id?: string | null
          schedule_type?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_admin?: boolean
          last_payment_date?: string | null
          notes?: string | null
          payment_status?: string
          phone?: string | null
          plan_id?: string | null
          schedule_type?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_bookings: {
        Row: {
          class_date: string
          created_at: string | null
          id: string
          slot_id: string
          status: string
          user_id: string
        }
        Insert: {
          class_date: string
          created_at?: string | null
          id?: string
          slot_id: string
          status?: string
          user_id: string
        }
        Update: {
          class_date?: string
          created_at?: string | null
          id?: string
          slot_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "schedule_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      regular_slots: {
        Row: {
          created_at: string | null
          id: string
          slot_id: string
          user_id: string
          week_parity: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          slot_id: string
          user_id: string
          week_parity?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          slot_id?: string
          user_id?: string
          week_parity?: string
        }
        Relationships: [
          {
            foreignKeyName: "regular_slots_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "schedule_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_slots: {
        Row: {
          class_type_id: string
          day_of_week: number
          duration_minutes: number
          id: string
          is_active: boolean
          max_capacity: number
          min_regulars: number
          start_time: string
        }
        Insert: {
          class_type_id: string
          day_of_week: number
          duration_minutes?: number
          id?: string
          is_active?: boolean
          max_capacity?: number
          min_regulars?: number
          start_time: string
        }
        Update: {
          class_type_id?: string
          day_of_week?: number
          duration_minutes?: number
          id?: string
          is_active?: boolean
          max_capacity?: number
          min_regulars?: number
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_slots_class_type_id_fkey"
            columns: ["class_type_id"]
            isOneToOne: false
            referencedRelation: "class_types"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          class_date: string
          created_at: string | null
          id: string
          slot_id: string
          user_id: string
        }
        Insert: {
          class_date: string
          created_at?: string | null
          id?: string
          slot_id: string
          user_id: string
        }
        Update: {
          class_date?: string
          created_at?: string | null
          id?: string
          slot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "schedule_slots"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: { is_admin: { Args: never; Returns: boolean } }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
