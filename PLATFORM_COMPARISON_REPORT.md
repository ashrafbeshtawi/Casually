# Casually — Platform Comparison Report

**Date:** 2026-04-14
**Surfaces analyzed:** Web App, Android App, Android Widget

---

## 1. Feature Matrix

| Feature | Web | Android | Widget |
|---------|:---:|:-------:|:------:|
| **Authentication** |
| Google OAuth login | Yes | Yes (One-Tap) | N/A (uses app session) |
| Session persistence | Cookie (DB session) | EncryptedSharedPrefs | Reads from EncryptedSharedPrefs |
| Sign out | Yes | Yes | N/A |
| **Projects (Long Tasks)** |
| View all projects | Yes | Yes | Active only |
| Create project | Yes | Yes | No (launches app) |
| Edit project (title/desc/emoji/priority) | Yes | Yes | No |
| Delete project | Yes | Yes | No |
| Change project state | Yes | Yes | Yes (long tasks) |
| Filter by state | Yes | Yes | No (hardcoded to ACTIVE) |
| Filter by priority | No | No | No |
| Project collapse/expand | Yes | Yes | Yes |
| Collapse state persistence | localStorage | ViewModel (lost on restart) | Glance DataStore (survives restart) |
| Collapse state synced to server | No | No | No |
| Protected projects ("One-Off Tasks", "Routines") | Yes | Yes | Yes (tab filtering) |
| Task count per project | Yes | Yes | Yes (done/total) |
| **Tasks (Short Tasks)** |
| View tasks | Yes | Yes | Active only |
| Create task | Yes | Yes | No (launches app) |
| Edit task (title/desc/emoji/priority) | Yes | Yes | No |
| Delete task | Yes | Yes | No |
| Change task state | Yes | Yes | Yes |
| Move task to another project | Yes | Yes | No |
| Filter by state | Yes | Yes | No |
| Drag-and-drop reordering | No (API exists) | No | No |
| Manual order field | Yes (via PATCH) | Yes (via PATCH) | No |
| Set blocked-by dependency | Yes (on BLOCKED transition) | No UI | No |
| View blocked-by info | Yes | No | No |
| **Challenges** |
| View challenges | Yes | Yes | No |
| Create challenge | Yes | Yes | No |
| Edit challenge | Yes | Yes | No |
| Delete challenge | Yes | Yes | No |
| Relapse (reset timer) | Yes | Yes | No |
| Live duration timer | Yes (updates every second) | Yes (updates every second) | No |
| League system | Yes | Yes | No |
| **Dashboard** |
| Tab switching (One-Offs/Projects/Routines) | Yes | Yes | Yes |
| Active-only view | Yes | Yes | Yes |
| Quick-add task from dashboard | Yes (inline + icon) | Yes (FAB) | No (launches app) |
| Auto-refresh | No (manual) | Every 60 seconds | Every 15 minutes |
| Pull-to-refresh | No | Yes | No |
| Manual refresh button | No | No | Yes |
| **Achievements** |
| View completed tasks | Yes | Yes | No |
| Grouped by project | Yes | Yes | N/A |
| Expand/collapse groups | Yes | Yes | N/A |
| **Settings** |
| Theme toggle (light/dark/system) | Yes (header toggle) | Yes (settings screen) | Auto (follows system) |
| User profile display | Yes (avatar dropdown) | Yes (settings screen) | No |
| **UI/UX** |
| Loading skeletons | Yes | Yes (spinner) | "Syncing..." text |
| Empty states | Yes | Yes | Yes ("No active projects") |
| Confirmation dialogs | Yes (AlertDialog) | Yes (AlertDialog) | No |
| Toast notifications | Yes | No | No |
| Error retry | Via re-navigation | Yes (retry button) | Via refresh |

---

## 2. State Machine Comparison

State transitions are **identical** across all three surfaces:

| From | Valid Transitions |
|------|-------------------|
| ACTIVE | WAITING, BLOCKED, DONE |
| WAITING | ACTIVE, BLOCKED, DONE |
| BLOCKED | ACTIVE, WAITING, DONE |
| DONE | ACTIVE, WAITING |

**Server-side rules enforced by web API (applies to all clients):**
- Cannot change child state if parent is BLOCKED or DONE
- Parent state change cascades only to children in the parent's old state
- "One-Off Tasks" and "Routines" projects cannot change state or be deleted

---

## 3. Critical Behavioral Differences

### 3.1 Task State Changes — Widget vs App/Web

| Aspect | Web | Android App | Widget |
|--------|-----|-------------|--------|
| Request method | Direct fetch() | Direct Retrofit call | Direct HTTP in Activity (was WorkManager) |
| Optimistic update | No (waits for response) | Yes (updates UI, rolls back on fail) | Yes (mutates cache, re-fetches after) |
| Error recovery | Shows toast error | Refreshes all data | Re-fetches server truth |
| Loading indicator | Button spinner | None (optimistic) | Global "Syncing..." banner |

### 3.2 Data Freshness

| Surface | Strategy | Staleness Risk |
|---------|----------|---------------|
| Web | Fetch on navigation, no polling | Low (always fresh on page load) |
| Android | Fetch on navigation + 60s polling | Low |
| Widget | Cache-first + 15min periodic refresh | **High** — can show 15-min stale data |

### 3.3 Collapse State — Three Different Implementations

- **Web:** Stored in `localStorage` under key `casually-active-dashboard-collapsed`. Persists across sessions. Not synced to server.
- **Android App:** Stored in ViewModel `collapsedProjects: Set<String>`. **Lost on app restart** or screen recreation.
- **Widget:** Stored in Glance DataStore per widget instance. Persists across widget updates. Seeds from server `collapsed` field on first load. Not synced back.
- **Server:** The `collapsed` field exists on `LongRunningTask` and can be PATCH'd, but **none of the clients sync collapse state to the server**, so collapse state is inconsistent across devices and surfaces.

### 3.4 Blocking Dependencies

- **Web:** Full support — can set `blockedById` when transitioning to BLOCKED, displays "Blocked by: [task]" on cards.
- **Android App:** API interface declares `blockedById` in `ChangeStateRequest`, but **no UI exists** to select a blocking task or view blocking relationships.
- **Widget:** No blocking support. State picker shows BLOCKED as an option but cannot set `blockedById`.

### 3.5 New Task Default State

- **Web:** New short tasks inherit parent's current state (server-side logic in `POST /api/tasks/short`).
- **Android App:** Sends `CreateShortTaskRequest` without explicit state — server assigns parent's state.
- **Widget:** Cannot create tasks.

### 3.6 Protected Project Detection

- **Web:** Checks `task.title === "One-Off Tasks" || task.title === "Routines"` in UI components.
- **Android App:** Same string comparison — **fragile** if titles are ever changed or localized.
- **Widget:** Filters tabs by title matching — same fragility.

---

## 4. API Coverage

### Endpoints used by each surface

| Endpoint | Web | Android | Widget |
|----------|:---:|:-------:|:------:|
| `POST /api/auth/mobile` | No | Yes | No |
| `GET /api/tasks/long` | Yes | Yes | Yes (state=ACTIVE only) |
| `POST /api/tasks/long` | Yes | Yes | No |
| `GET /api/tasks/long/[id]` | Yes | Yes | No |
| `PATCH /api/tasks/long/[id]` | Yes | Yes | No |
| `DELETE /api/tasks/long/[id]` | Yes | Yes | No |
| `PATCH /api/tasks/long/[id]/state` | Yes | Yes | Yes |
| `GET /api/tasks/short` | Yes | Yes | Yes (state=ACTIVE only) |
| `POST /api/tasks/short` | Yes | Yes | No |
| `GET /api/tasks/short/[id]` | Yes | Yes | No |
| `PATCH /api/tasks/short/[id]` | Yes | Yes | No |
| `DELETE /api/tasks/short/[id]` | Yes | Yes | No |
| `PATCH /api/tasks/short/[id]/state` | Yes | Yes | Yes |
| `PATCH /api/tasks/short/[id]/move` | Yes | Yes | No |
| `GET /api/challenges` | Yes | Yes | No |
| `POST /api/challenges` | Yes | Yes | No |
| `PATCH /api/challenges/[id]` | Yes | Yes | No |
| `DELETE /api/challenges/[id]` | Yes | Yes | No |
| `POST /api/challenges/[id]/relapse` | Yes | Yes | No |

### Widget-specific HTTP implementation

The widget uses raw `OkHttpClient` calls (not Retrofit) in `WidgetDataProvider`. Authentication is sent via cookies (`__Secure-authjs.session-token` and `authjs.session-token`), unlike the Android app which uses a Bearer-style `Authorization` header via `AuthInterceptor`.

---

## 5. Data Model Differences

### Widget's simplified models vs App/Web

| Field | Web/Android Full Model | Widget Model |
|-------|----------------------|--------------|
| `id` | Yes | Yes |
| `title` | Yes | Yes |
| `description` | Yes | **No** |
| `emoji` | Yes | Yes |
| `priority` | Yes | Yes |
| `state` | Yes | Yes |
| `order` | Yes | **No** |
| `collapsed` | Yes | Yes (projects only) |
| `blockedById` | Yes | **No** |
| `blockedBy` | Yes | **No** |
| `parentId` | Yes (short tasks) | Yes (short tasks) |
| `children` | Yes (long tasks) | **No** (tasks fetched separately) |
| `_count.children` | Yes | **No** |
| `createdAt` | Yes | **No** |
| `updatedAt` | Yes | **No** |

---

## 6. Missing Features by Surface

### Android App — Missing vs Web
1. **Blocking dependency UI** — Cannot set or view `blockedById`
2. **Drag-and-drop reordering** — No reorder UI despite API support
3. **Toast/snackbar feedback** — No success notifications after actions
4. **Persistent collapse state** — Lost on app restart (ViewModel-only)
5. **Task descriptions in list view** — Descriptions only shown in edit sheet, not in task rows
6. **Search** — No search functionality
7. **Offline mode** — No local database; always requires network

### Widget — Missing vs Android App
1. **Task creation** — Must launch main app
2. **Task editing** — No edit capability
3. **Task deletion** — No delete capability
4. **Move task** — No move capability
5. **Challenges** — Not displayed
6. **Achievements** — Not displayed
7. **Priority changes** — Not supported
8. **Filtering** — Hardcoded to ACTIVE state only
9. **Descriptions** — Not stored or displayed
10. **Blocking info** — Not tracked

---

## 7. Bugs & Issues Found

### 7.1 Widget — State change stuck on loading (FIXED)
**Severity:** Critical
**Status:** Fixed in this session

The widget delegated state-change HTTP calls to a `WorkManager` worker. If the worker failed silently (null token, missing input data), the loading flag was never cleared, leaving the widget permanently stuck on "Syncing...". Additionally, the optimistic cache update removed the task from the widget display, but the server never received the request — so data was lost from the widget view.

**Fix applied:** HTTP call now executes directly in `WidgetStatePickerActivity.performStateChange()` with guaranteed loading cleanup via `setLoading(false)` in all code paths.

### 7.2 Collapse state inconsistency across platforms
**Severity:** Low
**Description:** Each platform stores collapse state differently (localStorage, ViewModel, Glance DataStore). The server has a `collapsed` field but no client syncs to it. Collapsing a project on the web has no effect on Android or the widget.

### 7.3 Protected project detection is fragile
**Severity:** Medium
**Description:** All three surfaces identify protected projects by exact title match ("One-Off Tasks", "Routines"). If a user renames these via direct API call, or if titles are ever localized, the protection breaks and these projects become editable/deletable.

### 7.4 Android app collapse state lost on restart
**Severity:** Low
**Description:** The Android app stores collapse state in ViewModel memory. Killing the app or rotating the device resets all projects to expanded.

### 7.5 Widget shows stale data after app changes
**Severity:** Medium
**Description:** If a user makes changes in the web app or Android app, the widget won't reflect them until the next 15-minute periodic refresh or a manual refresh tap. There's no push mechanism to invalidate the widget cache.

---

## 8. Summary

The **web app** is the most complete surface with full CRUD, blocking dependencies, and stable state persistence. The **Android app** is nearly at feature parity but lacks blocking UI, persistent collapse state, and reorder functionality. The **widget** is intentionally minimal (view active tasks + change state) but had a critical bug where state changes never reached the server and left the UI stuck — now fixed.
