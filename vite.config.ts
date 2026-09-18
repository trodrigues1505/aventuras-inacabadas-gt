import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Caminhos relativos: funciona tanto em dominio raiz quanto em
  // usuario.github.io/nome-do-repo/ sem precisar editar nada.
  base: './',
  plugins: [react(), tailwindcss()],
})
