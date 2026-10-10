# Notes Dashboard

A small notes app: a React frontend talking to a FastAPI backend. Create, edit, delete, and search notes. Every change goes through the API with optimistic updates, loading states, and error handling.

```
backend/   FastAPI service (in-memory store)
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

Without uv: `pip install fastapi "uvicorn[standard]"` then `uvicorn main:app --reload`.

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

**Backend changes from the starter.** The provided template had the client supply ids, returned 200 with an error body for a missing note, and had no CORS. This version assigns ids server-side, returns 404/422 properly, validates that titles are non-empty, uses 201/204 status codes, and guards the store with a lock. Storage is still in-memory and resets on restart.

**Tailwind v4** via the Vite plugin. No config file needed.

**Vitest + React Testing Library.** Same API as Jest, but native to Vite so there's no second build pipeline.

## Stretch features

- **Search**: filters by title or content, case-insensitive, with an empty state for no matches.
- **Optimistic UI**: all three mutations, with rollback.
- **Tests**: `NoteCard.test.tsx` covers rendering, callbacks, disabled state, and the empty-content placeholder. The backend has `pytest` coverage for the CRUD round trip, 404s, and validation.
- **Keyboard and accessibility**: Escape closes the modal, dialog has `aria-modal` and a labelled title, loading and busy states are announced.

## Adapting to React Native

The split between data and presentation is the part that carries over. `api/`, `hooks/useNotes.ts`, and the Context would move unchanged into a shared package; TanStack Query works on React Native out of the box, and `fetch` is available. The pieces that change:

- **Components**: swap `div`/`button`/`input` for `View`, `Pressable`, `TextInput`, and the grid for a `FlatList` with `numColumns={2}`. Tailwind classes become NativeWind classes or `StyleSheet` objects.
- **Modal**: use React Native's `Modal` component or a bottom sheet; the Escape-key handler goes away in favour of the hardware back button on Android.
- **Confirm dialog**: `window.confirm` becomes `Alert.alert` with Cancel/Delete buttons.
- **Networking**: the Vite proxy doesn't exist, so `VITE_API_URL` becomes an absolute URL, and on Android emulator `localhost` is `10.0.2.2`.
- **Offline**: TanStack Query's `persistQueryClient` with AsyncStorage would give the app a cached list on launch, and `onlineManager` plus `NetInfo` would pause mutations until connectivity returns.
