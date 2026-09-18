import { supabase } from '../lib/supabase'

/**
 * BASE_URL preserva o subdiretorio do GitHub Pages
 * (usuario.github.io/nome-do-repo/). Com origin puro, o Google devolveria o
 * usuario para a raiz do dominio, fora do app.
 *
 * Esta URL precisa estar cadastrada em
 * Supabase -> Authentication -> URL Configuration -> Redirect URLs.
 */
function redirectUrl() {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl(),
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
