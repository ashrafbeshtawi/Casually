# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Casually is a cross-platform task management app with a **Next.js web app** and a **native Android app** sharing the same backend API.

## Common Commands

### Web App
- `npm run dev` — Start Next.js dev server
- `npm run build` — Production build
- `npm run lint` — Run ESLint
- `npm run db:generate` — Generate Prisma client
- `npm run db:migrate` — Run Prisma migrations (dev)
- `npm run db:push` — Push schema changes to database
- `npm run db:studio` — Open Prisma Studio
- `npm run db:seed` — Seed database (`tsx prisma/seed.ts`)

### Android App
- `cd android && ./gradlew assembleDebug` — Build debug APK
- `cd android && ./gradlew assembleRelease` — Build release APK
- `cd android && ./gradlew installDebug` — Install on connected device

## Architecture

### Web Stack
- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Prisma 7** ORM → **PostgreSQL** (Neon serverless)
- **NextAuth v5** (beta) with Google OAuth
- **Tailwind CSS 4** + **shadcn/ui** components
- **Zustand** for client state, **React Compiler** enabled
- **dnd-kit** for drag-and-drop reordering

### Android Stack
- **Kotlin** + **Jetpack Compose** (Material3)
- **Hilt** for DI, **Retrofit** + **Moshi** for networking
- **Glance** widgets with **WorkManager** background refresh
- Google One-Tap sign-in via Credentials API
- compileSdk 35, minSdk 26, JVM target 17

### Web Source Layout (`src/`)
- `app/(app)/` — Protected routes (dashboard, projects, challenges, routines, one-offs, achievements)
- `app/(auth)/` — Login page
- `app/api/` — REST API routes (`tasks/long/`, `tasks/short/`, `challenges/`)
- `components/` — React components (UI primitives in `components/ui/`)
- `lib/auth.ts` + `lib/auth.config.ts` — NextAuth setup with Google provider
- `lib/prisma.ts` — Prisma client singleton
- `lib/state-machine.ts` — Task state transition logic
- `store/index.ts` — Zustand store (sidebar state)
- `types/index.ts` — Shared TypeScript types (Priority, TaskState, Task)

### Android Source Layout (`android/app/src/main/java/com/casually/app/`)
- `data/api/` — Retrofit API interfaces (`CasuallyApi`, `AuthApi`)
- `data/repository/` — Repository pattern (`TaskRepository`, `AuthRepository`)
- `domain/model/` — Domain models (LongRunningTask, ShortRunningTask, Challenge, Priority, TaskState)
- `di/NetworkModule.kt` — Hilt module (Retrofit/OkHttp providers)
- `ui/` — Compose screens organized by feature (dashboard, projects, challenges, etc.)
- `widget/` — Glance home screen widget with DataStore-backed collapse state

### Data Model
- **LongRunningTask** (projects) — Parent tasks containing ShortRunningTasks, collapsible, orderable
- **ShortRunningTask** — Subtasks under a project
- **Challenge** — Habit/goal tracking
- States: `ACTIVE`, `WAITING`, `BLOCKED`, `DONE`
- Priorities: `HIGHEST`, `HIGH`, `MEDIUM`, `LOW`, `LOWEST`
- Tasks support blocking dependencies via `blockedById`

### Key Patterns
- TypeScript path alias: `@/*` maps to `./src/*`
- Web uses hybrid Server Components + Client Components
- Android follows MVVM: ViewModels → Repositories → Retrofit API
- Auth tokens stored in Android EncryptedSharedPreferences
- Widget collapse state uses Glance DataStore for instant UI updates (not SharedPreferences)

## Environment Variables

See `.env.example`: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## Deployment

- **Web**: Vercel (API base: `casually-two.vercel.app`)
- **Android**: Google Play Store (release config with ProGuard)
