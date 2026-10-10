# Notes Dashboard

A small notes app: a React frontend talking to a FastAPI backend. Create, edit, delete, and search notes. Every change goes through the API with optimistic updates, loading states, and error handling.

```
backend/   FastAPI service, Postgres (Supabase) via SQLModel, in-memory fallback
frontend/  Vite + React 19 + TypeScript
```

## Running it

You need Node 20+ and [uv](https://docs.astral.sh/uv/) (or any Python 3.11+ with pip).

**Backend** (port 8000):

```bash
cd backend
uv sync
uv run uvicorn main:app --reload
```

Without uv: `pip install fastapi "uvicorn[standard]" sqlmodel "psycopg[binary]" python-dotenv` then `uvicorn main:app --reload`.

With no configuration the backend uses an in-memory store, so it runs with zero setup. To persist notes, copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`:

- **Supabase**: Project Settings, Database, Connection string, pick **Session pooler** (port 5432). Avoid the direct `db.<ref>.supabase.co` host: it is IPv6-only and won't connect from an IPv4-only network.
- **Any Postgres**: a standard `postgresql://user:pass@host:5432/db` URL.
- **SQLite**: `sqlite:///./notes.db` for a local file.

The `notes` table is created automatically on startup.

**Frontend** (port 5173):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` to the backend, so no CORS setup is needed in the browser. Set `VITE_API_URL` if you want to point at a different host.

**Tests:**

```bash
cd backend && uv run pytest
cd frontend && npm test
```

Interactive API docs are at http://localhost:8000/docs.

## Decisions

**TanStack Query for server state, Context for UI state.** Notes are server data, so they live in the query cache with automatic refetching and invalidation. The search string and "which editor is open" are purely client concerns, so they live in a small Context (`NotesUIProvider`). Keeping these separate avoids the common trap of mirroring server data into a global store and then fighting to keep it in sync.

**Optimistic mutations.** Each create/update/delete hook in `useNotes.ts` snapshots the cache, patches it immediately, rolls back on error, and invalidates on settle. New notes get a negative temporary id so they can't collide with server ids, and the card renders them dimmed until the server confirms.

**Error handling.** A thin `request()` wrapper turns non-2xx responses and network failures into `ApiError` with a readable message. The dashboard shows a skeleton grid while loading, a retry banner if the initial fetch fails, and a dismissable banner if any mutation is rejected after rollback.

**Backend changes from the starter.** The provided template had the client supply ids, returned 200 with an error body for a missing note, and had no CORS. This version assigns ids server-side, returns 404/422 properly, validates that titles are non-empty, and uses 201/204 status codes.

**Storage behind a small interface.** `store.py` defines a `NoteStore` protocol with two implementations: `InMemoryNoteStore` (a lock-guarded dict) and `SqlNoteStore` (SQLModel on top of SQLAlchemy). `create_store()` picks one from `DATABASE_URL` at startup and the route handlers receive it through FastAPI's dependency injection, so the API code never knows which backend it has. Supabase is just Postgres, so there is no Supabase-specific client; the same URL mechanism works for a local Postgres or SQLite, and a reviewer without Supabase credentials can still run everything. The API schema (`Note`) is deliberately separate from the table model (`NoteRow`) so the two can evolve independently.

**Tests run against both stores.** The pytest `client` fixture is parametrised over the in-memory store and an in-memory SQLite `SqlNoteStore`, so the SQL path is covered on every run without a database server.

**Tailwind v4** via the Vite plugin. No config file needed.

**Vitest + React Testing Library.** Same API as Jest, but native to Vite so there's no second build pipeline.

## Stretch features

- **Search**: filters by title or content, case-insensitive, with an empty state for no matches.
- **Optimistic UI**: all three mutations, with rollback.
- **Tests**: `NoteCard.test.tsx` covers rendering, callbacks, disabled state, and the empty-content placeholder. The backend has `pytest` coverage for the CRUD round trip, ordering, 404s, and validation, run against both store implementations.
- **Persistence**: Postgres via Supabase (or any Postgres/SQLite) through `DATABASE_URL`, with automatic table creation and an in-memory fallback.
- **Keyboard and accessibility**: Escape closes the modal, dialog has `aria-modal` and a labelled title, loading and busy states are announced.

## Deploying to Vercel

One Vercel project serves both halves from the same domain, so the frontend keeps calling `/api` and no CORS configuration is needed.

- `api/index.py` mounts the FastAPI app under `/api`; Vercel runs it as a Python serverless function.
- `vercel.json` rewrites `/api/*` to that function.
- `requirements.txt` at the repo root is what Vercel installs for the function.
- When `VERCEL` is set, the engine uses `NullPool` (one connection per request) and disables server-side prepared statements so it works through a transaction-mode pooler.

Import the repo in Vercel and use these settings:

| Setting | Value |
| --- | --- |
| Framework Preset | Other |
| Root Directory | `./` |
| Build Command | `cd frontend && npm ci && npm run build` |
| Output Directory | `frontend/dist` |
| Environment Variable | `DATABASE_URL` = Supabase **Transaction pooler** string (port 6543) |

Use the transaction pooler rather than the session pooler for serverless: functions open many short-lived connections, and session mode would exhaust the pool. Without `DATABASE_URL` the function falls back to the in-memory store, which resets on every cold start, so set it before relying on the deployment.

## Adapting to React Native

The split between data and presentation is the part that carries over. `api/`, `hooks/useNotes.ts`, and the Context would move unchanged into a shared package; TanStack Query works on React Native out of the box, and `fetch` is available. The pieces that change:

- **Components**: swap `div`/`button`/`input` for `View`, `Pressable`, `TextInput`, and the grid for a `FlatList` with `numColumns={2}`. Tailwind classes become NativeWind classes or `StyleSheet` objects.
- **Modal**: use React Native's `Modal` component or a bottom sheet; the Escape-key handler goes away in favour of the hardware back button on Android.
- **Confirm dialog**: `window.confirm` becomes `Alert.alert` with Cancel/Delete buttons.
- **Networking**: the Vite proxy doesn't exist, so `VITE_API_URL` becomes an absolute URL, and on Android emulator `localhost` is `10.0.2.2`.
- **Offline**: TanStack Query's `persistQueryClient` with AsyncStorage would give the app a cached list on launch, and `onlineManager` plus `NetInfo` would pause mutations until connectivity returns.
