import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/AuthProvider'
import { GameProvider } from './hooks/GameProvider'
import { FullScreenLoader } from './components/FullScreenLoader'
import { Notice } from './components/Notice'
import { Button } from './components/Button'
import AppShell from './layouts/AppShell'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Planets from './pages/Planets'
import Missions from './pages/Missions'
import Crew from './pages/Crew'
import Admin from './pages/Admin'
import Settings from './pages/Settings'

export default function App() {
  const { ready, session, profile, error, retry } = useAuth()

  if (!ready) return <FullScreenLoader label="Retomando sua aventura" />

  // Sessao valida mas o perfil nao carregou: nao mande o jogador de volta ao
  // login (ele ja esta autenticado) — mostre a falha real e deixe tentar de novo.
  if (session && error) {
    return (
      <main className="grid min-h-dvh place-items-center px-6">
        <div className="w-full max-w-md">
          <Notice
            title="Seu progresso nao carregou"
            action={<Button onClick={retry}>Tentar de novo</Button>}
          >
            {error}
          </Notice>
        </div>
      </main>
    )
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/entrar" element={<Login />} />
        <Route path="*" element={<Navigate to="/entrar" replace />} />
      </Routes>
    )
  }

  if (!profile) return <FullScreenLoader label="Preparando seu perfil" />

  return (
    <GameProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/planetas" element={<Planets />} />
          <Route path="/missoes" element={<Missions />} />
          <Route path="/tripulacao" element={<Crew />} />
          <Route path="/painel" element={<Admin />} />
          <Route path="/configuracoes" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </GameProvider>
  )
}
