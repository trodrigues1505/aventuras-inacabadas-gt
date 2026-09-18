import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { Button } from '../components/Button'
import { Card, CardNote, CardTitle } from '../components/Card'
import { Avatar } from '../layouts/AppShell'
import { useAuth } from '../hooks/AuthProvider'

export default function Settings() {
  const { profile, session, signOut } = useAuth()
  const [busy, setBusy] = useState(false)

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8 md:px-10 md:py-12">
      <h1 className="display text-[26px] md:text-[30px] mb-8">Configuracoes</h1>

      <Card className="mb-5">
        <CardTitle>Conta Google</CardTitle>
        <CardNote>A autenticacao e feita pelo Google. Nenhuma senha e guardada aqui.</CardNote>
        <div className="mt-5 flex items-center gap-4">
          <Avatar url={profile?.avatar_url} name={profile?.display_name} size={44} />
          <div className="min-w-0">
            <p className="font-medium truncate">{profile?.display_name}</p>
            <p className="text-[13px] text-muted truncate">{session?.user.email}</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle>Sessao</CardTitle>
        <CardNote>
          Sair encerra a sessao neste dispositivo. O registro de bordo continua
          salvo.
        </CardNote>
        <div className="mt-5">
          <Button
            variant="secondary"
            loading={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await signOut()
              } finally {
                setBusy(false)
              }
            }}
          >
            <LogOut size={16} aria-hidden />
            Sair
          </Button>
        </div>
      </Card>
    </main>
  )
}
