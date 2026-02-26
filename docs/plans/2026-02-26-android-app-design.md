# Casually Android App — Design Document

**Date**: 2026-02-26
**Tech Stack**: Kotlin + Jetpack Compose, Glance API widget

## Summary

Native Android app for Casually task management with a home screen widget. Full CRUD support (create, edit, delete, reorder, state changes for both long-running and short-running tasks). Online-only (no local DB). Authenticates via native Google Sign-In with backend session exchange. Widget shows active projects with their active tasks in an expandable compact list.

## Backend Changes

### New Endpoint: `POST /api/auth/mobile`

Single new endpoint on the existing Next.js backend:

- **Request**: `{ idToken: "google_id_token_string" }`
- **Behavior**:
  1. Verify Google ID token with Google's servers
  2. Find or create user (reuse existing NextAuth user creation logic, including auto-creating "One-Off Tasks" + "Routines")
  3. Create a database session
  4. Return session token
- **Response**: `{ sessionToken: "...", user: { id, name, email, image } }`

The Android app stores the token in EncryptedSharedPreferences and sends it as `Cookie: authjs.session-token=<token>` on all API requests. All existing API routes work unchanged.

### No Other Backend Changes

All `/api/tasks/long/` and `/api/tasks/short/` routes work as-is with cookie-based session auth.

## Android Architecture

**Pattern**: Single-Module MVVM
- `ui/` — Compose screens + ViewModels
- `data/` — Retrofit API service, Repository, DTOs
- `domain/` — Models (LongRunningTask, ShortRunningTask, enums)
- `widget/` — Glance widget + WorkManager refresh
- `auth/` — Google Sign-In + token exchange

## Screens & Navigation

### Bottom Navigation (3 tabs)
- **Dashboard** — Active short-running tasks grouped by parent project
- **Projects** — All long-running tasks as cards
- **Settings** — User info, sign out

### Stack Screens
- **ProjectDetail/[id]** — Project header + child task list, state changers, FAB to add task
- **CreateProject** — Bottom sheet form (title, description, emoji, priority, state)
- **EditProject/[id]** — Bottom sheet form for editing
- **CreateTask/[parentId]** — Bottom sheet form for new short-running task
- **EditTask/[id]** — Bottom sheet form for editing
- **Login** — Google Sign-In button, shown when not authenticated

### Screen Details

**Dashboard**: Shows all ACTIVE short-running tasks grouped under parent project headers (emoji + title). Each task: emoji, title, priority dot, state badge. Tap task → ProjectDetail. Pull-to-refresh.

**Projects**: Grid/list of all long-running tasks. Each card: emoji, title, priority border, state badge, child count. FAB to create. Tap → ProjectDetail.

**ProjectDetail**: Project header (emoji, title, description, state, priority). Child task list below. State changer for project (cascade warning). FAB to add task. Swipe/long-press for edit/delete. State changer per task.

**Settings**: User info display, sign out button.

## Widget Design (Glance API)

### Layout
```
┌─────────────────────────────┐
│  Casually                 🔄 │  ← App name + refresh button
├─────────────────────────────┤
│ 📌 One-Off Tasks        ▼   │  ← Project header (expandable)
│   🛒 Buy groceries          │  ← Active child task
│   🦷 Call dentist            │
│ 🔄 Routines             ▼   │
│   🧘 Meditate               │
│   🏃 Exercise                │
│ 🌐 Redesign Website     ▼   │
│   ✏️ Create wireframes       │
└─────────────────────────────┘
```

### Behavior
- Shows all ACTIVE long-running tasks as expandable headers
- Under each header: ACTIVE short-running tasks for that project
- Tap project header → opens app to ProjectDetail
- Tap task → opens app to ProjectDetail
- Refresh button → re-fetches from API
- Auto-refreshes every 30 minutes via WorkManager
- Not authenticated → shows "Sign in to Casually" message

### Data Fetching
- WorkManager for periodic background refresh
- Calls `GET /api/tasks/long?state=ACTIVE` + `GET /api/tasks/short?state=ACTIVE`
- Caches in SharedPreferences for instant widget display
- Session token from EncryptedSharedPreferences

## Tech Stack

| Purpose | Library |
|---------|---------|
| UI | Jetpack Compose (BOM) |
| Navigation | Navigation Compose |
| HTTP Client | Retrofit 2 + OkHttp + Moshi |
| Auth | Google Identity Services (One Tap) |
| Secure Storage | EncryptedSharedPreferences |
| Widget | Glance (Compose widgets) |
| Background Sync | WorkManager |
| DI | Hilt |
| Image Loading | Coil |
| State | ViewModel + StateFlow |

## Project Structure

```
android/
├── app/
│   ├── src/main/
│   │   ├── java/com/casually/app/
│   │   │   ├── CasuallyApp.kt
│   │   │   ├── MainActivity.kt
│   │   │   ├── data/
│   │   │   │   ├── api/
│   │   │   │   │   ├── CasuallyApi.kt
│   │   │   │   │   ├── AuthApi.kt
│   │   │   │   │   └── AuthInterceptor.kt
│   │   │   │   ├── model/
│   │   │   │   └── repository/
│   │   │   │       ├── TaskRepository.kt
│   │   │   │       └── AuthRepository.kt
│   │   │   ├── domain/
│   │   │   │   └── model/
│   │   │   ├── ui/
│   │   │   │   ├── navigation/AppNavigation.kt
│   │   │   │   ├── theme/Theme.kt
│   │   │   │   ├── login/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── projects/
│   │   │   │   ├── projectdetail/
│   │   │   │   ├── settings/
│   │   │   │   └── components/
│   │   │   └── widget/
│   │   │       ├── CasuallyWidget.kt
│   │   │       ├── WidgetRefreshWorker.kt
│   │   │       └── WidgetDataProvider.kt
│   │   ├── res/
│   │   │   ├── xml/widget_info.xml
│   │   │   └── values/
│   │   └── AndroidManifest.xml
│   └── build.gradle.kts
├── build.gradle.kts
├── settings.gradle.kts
└── gradle.properties
```

Lives as `android/` directory at the root of the Casually repo.
