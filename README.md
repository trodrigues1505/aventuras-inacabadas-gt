# Aventuras Inacabadas — FASE 1 (fundação)

RPG de exploração espacial sobre a rotina: cada área da vida é um mundo, cada
tarefa é uma missão de superfície, e a facção inimiga — **a Malha** — é um
enxame de máquinas que padroniza mundos e apaga o que ficou inacabado.
Nome do app, nome da nave, nome da facção e o vocabulário da interface
(mundo / missão / setor) vivem todos em `src/data/brand.ts`: trocar qualquer um
deles é editar uma linha, não caçar texto pelos componentes.


React + TypeScript + Vite + Tailwind v4 + Supabase Auth (Google).

O que esta fase entrega: login com Google, sessão persistente, logout, proteção
de rotas, criação automática de `profiles` e `player_state` no primeiro acesso,
e RLS ativo nas duas tabelas. Nada de tarefas, XP ou combate ainda.

---

## 1. Instalar

```bash
npm install
cp .env.example .env.local   # preencha os dois valores
npm run dev
```

## 2. Criar o projeto no Supabase

1. Crie um projeto em supabase.com.
2. Em **Project Settings → API**, copie:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`
3. Cole em `.env.local`. **Nunca** coloque a `service_role` key no frontend nem
   no Git — ela ignora RLS.

## 3. Rodar a migration

Abra **SQL Editor** no Supabase e execute o conteúdo de
`supabase/migrations/001_profiles_player_state.sql`.

Confira depois em **Table Editor** que `profiles` e `player_state` aparecem com
o cadeado de RLS ativo.

## 4. Configurar o Google OAuth

**No Google Cloud Console** (console.cloud.google.com):

1. APIs & Services → OAuth consent screen → tipo External → preencha o básico.
2. Credentials → Create credentials → OAuth client ID → Web application.
3. Em **Authorized redirect URIs**, adicione exatamente:
   ```
   https://<SEU-PROJECT-REF>.supabase.co/auth/v1/callback
   ```
   (esse endereço aparece pronto na tela do provider Google no Supabase)
4. Guarde o Client ID e o Client Secret.

**No Supabase**:

5. Authentication → Providers → Google → ative e cole Client ID + Secret.
6. Authentication → URL Configuration:
   - **Site URL**: `http://localhost:5173` (troque pelo domínio em produção)
   - **Redirect URLs**: adicione `http://localhost:5173/**` e, depois, a URL
     de produção.

O app chama `signInWithOAuth` com `redirectTo: window.location.origin + '/'`.
Se essa origem não estiver nas Redirect URLs, o Google volta para o Site URL e
o login parece "não fazer nada".

---

## 5. Publicar no GitHub Pages

O projeto tem etapa de build (Vite), entao o Pages nao pode servir os arquivos
do repositorio direto — quem compila e o GitHub Actions, pelo workflow que ja
vem em `.github/workflows/deploy.yml`.

1. Crie o repositorio e suba **todos** os arquivos deste ZIP (sem `node_modules`
   e sem `dist`; o `.gitignore` ja cuida disso). Inclua `package-lock.json` — o
   workflow usa `npm ci` e falha sem ele.
2. **Settings -> Secrets and variables -> Actions -> New repository secret**,
   crie os dois:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Settings -> Pages -> Source: GitHub Actions**.
4. Faca um commit em `main` (ou rode o workflow em Actions). Ao terminar, a URL
   aparece no proprio job de deploy.
5. Volte ao Supabase, **Authentication -> URL Configuration**, e ajuste:
   - Site URL: `https://SEU-USUARIO.github.io/NOME-DO-REPO/`
   - Redirect URLs: adicione `https://SEU-USUARIO.github.io/NOME-DO-REPO/**`

Tres detalhes que fazem o app quebrar em producao se forem ignorados:

- **Rotas usam `#`** (`HashRouter`). O Pages devolve 404 para `/configuracoes`,
  porque esse arquivo nao existe no disco. Com hash, o servidor so ve
  `index.html`. As URLs ficam `.../NOME-DO-REPO/#/configuracoes`.
- **`base: './'` no `vite.config.ts`.** Com `/` absoluto, os assets seriam
  buscados na raiz do dominio e a pagina abriria em branco.
- **A anon key vai para o bundle publico** — isso e esperado e seguro, desde que
  a RLS esteja ativa. Ela e o unico motivo pelo qual essa chave pode ser
  exposta. A `service_role` nunca entra aqui.

---

## Testes da FASE 1

Antes de seguir para a FASE 2, confirme:

- [ ] Login com Google funciona e cai no dashboard.
- [ ] Usuário novo: `profiles` e `player_state` ganham uma linha cada.
- [ ] Recarregar a página mantém a sessão (não volta para a tela de entrada).
- [ ] Logout limpa a sessão e volta para `/entrar`.
- [ ] Entrar de novo mostra nível, XP e moedas iguais aos de antes.
- [ ] Abrir o app em duas abas ao mesmo tempo **não** cria perfil duplicado.
- [ ] RLS: com o usuário A logado, rodar no console
      `await supabase.from('profiles').select('*')` retorna **apenas** a linha
      de A, mesmo existindo outros jogadores na tabela.
- [ ] Em producao, logar pela URL do Pages volta para dentro do app (e nao
      para a raiz do dominio).
- [ ] Sem `.env.local`, o app mostra a mensagem sobre variáveis ausentes em vez
      de tela branca.

---

## Estrutura

```
src/
  components/   Button, Card, XpBar, Notice, FullScreenLoader, GoogleMark
  data/         brand.ts (nomes e vocabulario), gameConfig.ts (curva de XP),
                characters.ts (a tripulacao e seus postos)
  hooks/        AuthProvider.tsx (sessão + carga do jogador)
  layouts/      AppShell.tsx (sidebar desktop / nav inferior mobile)
  lib/          supabase.ts
  pages/        Login, Dashboard, Settings
  services/     authService.ts, playerService.ts
  types/        database.ts, player.ts
supabase/migrations/
```

Regra de arquitetura: componentes não chamam o Supabase direto — passam por
`services/`. Regra numérica de jogo não vive em componente — vive em
`data/gameConfig.ts`.

## Tipos gerados (opcional, recomendado na FASE 3)

`src/types/database.ts` é escrito à mão por enquanto. Quando o schema crescer:

```bash
npx supabase gen types typescript --project-id <REF> > src/types/database.ts
```
