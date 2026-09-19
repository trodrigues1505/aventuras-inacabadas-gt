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

export type World = {
  id: string
  user_id: string
  name: string
  description: string | null
  icon: string
  accent: WorldAccent
  created_at: string
  updated_at: string
}

/**
 * Acento do mundo como chave, não como hex: a paleta continua
 * sendo decidida no design system. Guardar '#8b5cf6' no banco
 * significaria que trocar a paleta exige migração de dados.
 */
export type WorldAccent = 'azure' | 'good' | 'ember' | 'bad' | 'violet' | 'cyan'

export type Priority = 'low' | 'mid' | 'high'
export type MissionStatus = 'open' | 'done'

export type Mission = {
  id: string
  user_id: string
  world_id: string | null
  title: string
  description: string | null
  priority: Priority
  status: MissionStatus
  due_date: string | null
  reward: number
  completed_at: string | null
  created_at: string
  updated_at: string
}

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
      worlds: {
        Row: World
        Insert: Partial<World> & { user_id: string; name: string }
        Update: Partial<World>
        Relationships: []
      }
      missions: {
        Row: Mission
        Insert: Partial<Mission> & { user_id: string; title: string }
        Update: Partial<Mission>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
