export type Profile = {
  id: string
  user_id: string
  display_name: string | null
  avatar_url: string | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export type PlayerState = {
  id: string
  user_id: string
  level: number
  xp: number
  currency: number
  created_at: string
  updated_at: string
}

/**
 * Tipagem minima das tabelas da FASE 1.
 * Trocar por `supabase gen types typescript` quando o schema estabilizar.
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { user_id: string }
        Update: Partial<Profile>
        Relationships: []
      }
      player_state: {
        Row: PlayerState
        Insert: Partial<PlayerState> & { user_id: string }
        Update: Partial<PlayerState>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
