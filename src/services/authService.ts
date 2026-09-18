import { supabase } from '../lib/supabase'

/**
 * Deriva a URL de retorno da propria pagina em execucao, e nao de
 * import.meta.env.BASE_URL: com base: './', o BASE_URL vale './' e
 * new URL('./', origin) resolve para a raiz do dominio, perdendo o
 * subdiretorio do GitHub Pages.
 *
 * location.pathname aqui e '/aventuras-inacabadas-gt/index.html' ou
 * '/aventuras-inacabadas-gt/'. Cortar tudo depois da ultima barra deixa
 * exatamente a pasta do app. O hash do HashRouter fica de fora de proposito:
 * o Supabase compara a URL sem ele.
 *
 * Esta URL precisa estar cadastrada em
 * Supabase -> Authentication -> URL Configuration -> Redirect URLs.
 */
function redirectUrl() {
  const dir = window.location.pathname.replace(/[^/]*$/, '')
  return `${window.location.origin}${dir}`
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
