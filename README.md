# Casually

Cross-platform task management: a **Next.js web app** and a **native Android app** sharing one backend, plus a built-in **MCP server** so AI assistants can manage your tasks too.

**Live app:** [casually-two.vercel.app](https://casually-two.vercel.app)

## Features

- **Projects** (long-running tasks) containing **subtasks** (short-running tasks), with drag-and-drop ordering and collapsible cards
- **One-off tasks** — quick items under a dedicated "One-Off Tasks" project
- **Routines** — recurring habits under a dedicated "Routines" project
- **Challenges** — streak tracking with relapse support, plus **achievements**
- Task **states** (`ACTIVE`, `WAITING`, `BLOCKED`, `DONE`) driven by a state machine, with blocking dependencies between tasks
- Five **priorities** (`HIGHEST` → `LOWEST`)
- Google sign-in (NextAuth on web, One-Tap on Android)
- Android **home screen widget** (Glance) with background refresh
- **MCP server** with API-token auth for AI assistants like Claude

## Tech Stack

| | Web | Android |
|---|---|---|
| UI | Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui | Kotlin, Jetpack Compose (Material3), Glance widgets |
| Data | Prisma 7 → PostgreSQL (Neon serverless) | Retrofit + Moshi against the web API |
| Auth | NextAuth v5 + Google OAuth | Google One-Tap, tokens in EncryptedSharedPreferences |
| Misc | Zustand, dnd-kit, React Compiler | Hilt DI, WorkManager |

## Getting Started (Web)

Requires Node 20+ and a PostgreSQL database (a free [Neon](https://neon.tech) project works).

```bash
git clone https://github.com/ashrafbeshtawi/Casually.git
cd Casually
npm install
cp .env.example .env   # then fill in the values below
npm run db:push        # sync schema to the database
npm run dev            # http://localhost:3000
```

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon/PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` in development |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth credentials from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run test` / `npm run test:watch` | Vitest suite |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:migrate` | Create/run dev migrations |
| `npm run db:push` | Push schema without a migration |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Seed the database |

## Getting Started (Android)

```bash
cd android
./gradlew assembleDebug     # build debug APK
./gradlew installDebug      # install on a connected device
```

The app targets compileSdk 35 / minSdk 26 and talks to the deployed web API.

## MCP Server

The backend exposes a [Model Context Protocol](https://modelcontextprotocol.io) server at `/api/mcp`, so an AI assistant can read and manage your tasks.

**Auth:** create an API token in **Settings** (web or Android). Tokens look like `csly_…`, are shown once, and only a SHA-256 hash is stored. Connect your MCP client with:

- URL: `https://casually-two.vercel.app/api/mcp`
- Header: `Authorization: Bearer csly_…`

### Tools

All list tools paginate with `limit` (default 20) and `offset` (default 0).

| Tool | Description |
|---|---|
| `list_projects` | List projects, optional `state` filter |
| `list_tasks` | List subtasks, optional `parentId`/`state` filters |
| `list_one_offs` | Tasks under the "One-Off Tasks" project |
| `list_routines` | Tasks under the "Routines" project |
| `get_project` | Single project incl. paginated subtasks |
| `get_task` | Single subtask |
| `create_project` | New project (`title`, `description?`, `emoji?`, `priority?`) |
| `create_task` | New subtask under a project |
| `create_routine` | New task under the "Routines" project |
| `update_task` | Update any subtask field; state changes go through the state machine |
| `update_project` | Same for projects |
| `move_task` | Move a subtask to another project |

Deletion is intentionally not exposed via MCP.

## REST API

The MCP tools are thin wrappers over the REST API under `src/app/api/`:

- `GET/POST /api/tasks/long` — projects (supports `state`, `priority`, `limit`, `offset`)
- `GET/PATCH/DELETE /api/tasks/long/[id]`, `PATCH /api/tasks/long/[id]/state`
- `GET/POST /api/tasks/short` — subtasks (supports `parentId`, `state`, `priority`, `limit`, `offset`)
- `GET/PATCH/DELETE /api/tasks/short/[id]`, `PATCH .../state`, `PATCH .../move`
- `GET/POST /api/challenges`, `PATCH/DELETE /api/challenges/[id]`, `POST .../relapse`
- `GET/POST /api/tokens`, `DELETE /api/tokens/[id]` — API token management

All routes accept either a NextAuth session cookie (web app) or a `Bearer csly_…` token.

## Project Layout

```
src/
  app/(app)/        # protected routes: dashboard, projects, challenges,
                    # routines, one-off, achievements, settings
  app/(auth)/       # login
  app/api/          # REST API + MCP server
  components/       # React components (primitives in components/ui/)
  lib/              # auth, prisma client, state machine, api tokens
  store/            # Zustand store
android/
  app/src/main/java/com/casually/app/
    data/           # Retrofit APIs + repositories
    domain/model/   # domain models
    ui/             # Compose screens by feature
    widget/         # Glance home screen widget
prisma/             # schema, migrations, seed
```

## Testing

```bash
npm run test
```

Vitest with a mocked `fetch` covers the MCP handler (tool registration, routing, pagination passthrough). Config in `vitest.config.ts`; tests live next to the code (`src/**/*.test.ts`).

## Deployment

- **Web:** Vercel — push to `main` deploys [casually-two.vercel.app](https://casually-two.vercel.app)
- **Android:** Google Play Store (release build with ProGuard)
