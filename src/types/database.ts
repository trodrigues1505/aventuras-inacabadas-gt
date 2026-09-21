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
  crew_id: string | null
  created_at: string
  updated_at: string
}

export type PlanetImage = 'varda' | 'thalassa' | 'zerion' | 'kestrel' | 'nyx'

export type World = {
  id: string
  user_id: string
  name: string
  description: string | null
  icon: string
  accent: WorldAccent
  slug: string | null
  /** Imagem temática do universo — independente do nome da categoria. */
  planet_image: PlanetImage | null
  created_at: string
  updated_at: string
}

export type WorldAccent = 'azure' | 'good' | 'ember' | 'bad' | 'violet' | 'cyan'

export type Priority = 'low' | 'mid' | 'high'

export type MissionStatus = 'open' | 'in_progress' | 'review' | 'done'

export type Recurrence = 'daily' | 'weekly' | 'monthly' | 'custom'

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
  estimated_minutes: number | null
  recurrence: Recurrence | null
  recurrence_days: number | null
  depends_on: string | null
  created_at: string
  updated_at: string
}

export type Subtask = {
  id: string
  mission_id: string
  user_id: string
  title: string
  done: boolean
  position: number
  created_at: string
  updated_at: string
}

export type Tag = {
  id: string
  user_id: string
  name: string
  color: WorldAccent
}

export type MissionLink = {
  id: string
  mission_id: string
  user_id: string
  label: string
  url: string
  created_at: string
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
      subtasks: {
        Row: Subtask
        Insert: Partial<Subtask> & { mission_id: string; user_id: string; title: string }
        Update: Partial<Subtask>
        Relationships: []
      }
      tags: {
        Row: Tag
        Insert: Partial<Tag> & { user_id: string; name: string }
        Update: Partial<Tag>
        Relationships: []
      }
      mission_links: {
        Row: MissionLink
        Insert: Partial<MissionLink> & { mission_id: string; user_id: string; label: string; url: string }
        Update: Partial<MissionLink>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
