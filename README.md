# 🪺 Nido

Plataforma compartida para parejas: tareas del hogar, presupuesto, despensa, cocina y vida en común — todo en un mismo nido cálido.

## Stack

- **Next.js 15** (App Router, RSC, TypeScript)
- **Supabase** (Auth + Postgres + RLS)
- **Tailwind CSS** + **Framer Motion**
- Deploy: **Vercel**

## Estructura

```
src/
  app/
    page.tsx              # Landing
    login/                # Iniciar sesión
    signup/               # Crear cuenta
    onboarding/home/      # Crear o unirse a un Home
    (app)/
      layout.tsx          # Shell con nav (requiere auth + home_id)
      dashboard/
      tasks/              # ✅ MVP completo
      budget/             # ✅ MVP completo
      groceries/          # 🚧 próxima iteración
      kitchen/
      pending/
      couple/
      me/
      settings/
  components/
    app-shell.tsx
    coming-soon.tsx
  lib/
    supabase/{client,server}.ts
    utils.ts
  middleware.ts           # Refresh de sesión + redirects
supabase/
  config.toml             # Config para Supabase CLI
  schema.sql              # Schema + RLS + RPCs (referencia)
  migrations/             # Migraciones versionadas (usadas por `supabase db push`)
```

## Setup

### 1. Supabase

**Proyecto:** `socuybmkmozbvboiiyav` · https://socuybmkmozbvboiiyav.supabase.co

Aplicá el schema con cualquiera de estas dos rutas:

**A) Rápida (SQL Editor)** — abrir https://supabase.com/dashboard/project/socuybmkmozbvboiiyav/sql/new, pegar `supabase/schema.sql` y ejecutar.

**B) Con CLI (recomendado para versionar):**
```bash
brew install supabase/tap/supabase   # o el método que uses
supabase login
supabase link --project-ref socuybmkmozbvboiiyav
supabase db push                      # aplica supabase/migrations/*.sql
```

Luego, en **Authentication → Providers**, asegurate que Email está activado. Para evitar confirmación por email durante desarrollo, desactivá "Confirm email" en Auth → Email.

Las variables ya están en `.env.local` (que está en `.gitignore`). Si necesitás recrearlas:
```
NEXT_PUBLIC_SUPABASE_URL=https://socuybmkmozbvboiiyav.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...   # Settings → API
```

### 2. Local

```bash
npm install
cp .env.example .env.local   # rellenar con tus valores
npm run dev
```

Abrir http://localhost:3000.

### 3. Vercel

1. Importar `victorbosch09/Nido` en https://vercel.com/new
2. Variables de entorno (Project Settings → Environment Variables, todas las envs):
   - `NEXT_PUBLIC_SUPABASE_URL=https://socuybmkmozbvboiiyav.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...`
3. Deploy.

En Supabase → Authentication → URL Configuration, agregá tu URL de Vercel a "Site URL" y "Redirect URLs" (`https://tu-deploy.vercel.app` y `https://tu-deploy.vercel.app/auth/callback`).

## Cómo funciona el modelo de pareja

1. Cada persona crea su cuenta (email + contraseña + nombre + avatar).
2. La primera persona crea un **Home** desde `/onboarding/home` y recibe un **código de 6 caracteres**.
3. La segunda persona se une usando ese código.
4. A partir de ahí, todos los módulos comparten datos por `home_id`. Las políticas RLS de Supabase garantizan que cada nido solo ve lo suyo.

## Estado del MVP

- [x] Auth + creación/unión de Home
- [x] Dashboard con greeting, frase del día, snapshot de tareas y presupuesto
- [x] Tareas: crear, completar, prioridad, recurrencia, asignación, métrica de equidad
- [x] Presupuesto: gastos por categoría, progreso por categoría, totales del mes
- [ ] Despensa inteligente (próxima iteración)
- [ ] Cocina y meal prep
- [ ] Pendientes (kanban)
- [ ] Pareja (citas, deseos, memorias, notas de amor)
- [ ] Espacio personal

## Idioma

UI en español por defecto. Listo para sumar i18n si se necesita inglés más adelante.
