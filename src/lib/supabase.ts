import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Sem isso, a falta de .env.local aparece como "Invalid URL" vindo de
 * dentro do supabase-js — longe da causa real. Aqui a causa fica explicita.
 */
export const supabaseConfigured = Boolean(url && anonKey)

export const supabase = createClient<Database>(
  url || 'http://localhost:54321',
  anonKey || 'anon-key-ausente',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  },
)
