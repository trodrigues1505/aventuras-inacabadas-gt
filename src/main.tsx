import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AuthProvider } from './hooks/AuthProvider'
import App from './App'
import './styles/global.css'

// HashRouter, e nao BrowserRouter: o GitHub Pages serve arquivos estaticos e
// devolve 404 em /configuracoes, porque esse arquivo nao existe no disco.
// Com hash, toda navegacao acontece depois do #, e o servidor so ve index.html.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
