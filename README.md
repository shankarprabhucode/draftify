# Draftify

A notes app modelled on Google Keep with a Notion-style editor: a sidebar with labels, a masonry wall of colour-coded cards with Keep's palette, pinning, labels, search, grid and list views, a floating "Take a note" button that opens a capture modal, and a rich-text editor with a formatting bubble and slash commands. Everything autosaves through a FastAPI API backed by Postgres (Supabase), with optimistic updates, undo on delete, loading and error states, and dark mode.

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

The tables are created automatically on startup. Set `SECRET_KEY` (any long random string) to sign session cookies; without it the backend uses a development key and refuses to start on Vercel.

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

**Frontend** (port 5173):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 for the marketing site, or http://localhost:5173/app for the app, and create an account. The Vite dev server proxies `/api/*` to the backend, so no CORS setup is needed in the browser. Set `VITE_API_URL` if you want to point at a different host.

**Tests:**

```bash
cd backend && uv run pytest
cd frontend && npm test
```

Interactive API docs are at http://localhost:8000/docs.

## Decisions

**Two pages, one build.** Vite builds two HTML entries: the marketing site at `/` (static HTML + Tailwind, with screenshots captured by a Playwright script) and the React app at `/app`. The site checks `/auth/me` and turns its calls to action into "Open Draftify" for signed-in visitors. The sign-in page accepts `?mode=signup` to open in sign-up mode.

**Accounts and sessions.** Email and password sign-up and sign-in live in the FastAPI backend rather than a third-party provider, so the zero-setup in-memory mode still works end to end. Passwords are hashed with Argon2. A session is a signed JWT (seven days) in an HTTP-only, SameSite=Lax cookie, marked Secure in production; the browser never reads it, and because the API is same-origin on both the dev proxy and Vercel there is no token to pass around. Every note and label has an owner and every store method takes the owner's id, so authorisation is enforced in one place rather than per route. Login attempts are rate-limited per client and email, and the wrong-email and wrong-password responses are identical. The first account to sign up adopts any notes and labels that predate accounts. The frontend shows the sign-in page until `/auth/me` succeeds and drops back to it on any 401.

**Rich text with TipTap.** The editor is [TipTap](https://tiptap.dev) (ProseMirror underneath), chosen because it is headless, so the look is entirely ours, and it has first-class React bindings. `src/editor/` holds the wrapper, a bubble toolbar that appears over a selection (bold, italic, underline, strikethrough, highlight, code, links, headings, lists) and a slash-command extension built on TipTap's suggestion utility: typing `/` opens a menu of block types. Content is stored as HTML in the note's `content` field and sanitised with DOMPurify before being rendered in card previews, since it comes from the server. Search runs over the plain text of that HTML.

**Keep-style interaction.** A floating "Take a note" button (with a checklist shortcut beside it) opens a centred capture modal with the full toolbar; Save, Escape or clicking the backdrop creates the note, so there is no form to submit. Popovers (colour, labels) render through a portal anchored to their button, so they are never clipped by card stacking contexts. Opening a card shows the full editor in a dialog that autosaves after a short pause (and immediately for colour and pin changes), with a status line instead of a Save button. Delete hides the note and offers Undo in a toast for six seconds before the request is sent. Pinned notes sit in their own section; everything else is ordered by last edit.

**Labels.** A `labels` table and a `note_labels` link table give notes a many-to-many label set. The sidebar lists every label as a filter, "Edit labels" manages them, and the card toolbar, capture panel and dialog each have a "Label note" picker with inline create. Names are unique case-insensitively (409 on clash); deleting a label detaches it from notes. The frontend resolves label ids to label objects from the labels cache when applying optimistic updates, so chips appear before the server replies.

**Keep's visual language.** Keep's light and dark palettes are used verbatim (`src/lib/colors.ts`), cards carry their colour edge to edge with a hover toolbar (colour, label, delete) and a pin in the corner, and pinned notes sort to the front of a single wall. The wall is a CSS grid used as a masonry: each card measures itself with a ResizeObserver and spans the right number of fixed-height rows, which keeps drag-and-drop transforms predictable. A list view (single centred column) is one click away in the top bar.

**Archive and Trash.** Notes carry an `archived` flag and a `deleted_at` timestamp. Archiving hides a note from the main wall (and unpins it, as Keep does); deleting moves it to the Trash, where it can be restored or deleted forever, and the store purges anything older than seven days on the next listing. `DELETE /notes/{id}` is the soft delete, `?permanent=true` the hard one, `POST /notes/{id}/restore` brings a note back and `DELETE /notes/trash` empties the trash. Every action is optimistic with an Undo toast; trashed notes open read-only.

**Responsive layout.** From the `md` breakpoint up the sidebar is an inline column that collapses to icons; on phones it becomes a slide-in drawer opened from the hamburger and closed by choosing an item, tapping the backdrop or pressing Escape. The wall uses Keep's two-column grid on phones so the list view (one column) is a real alternative, and previews are clamped shorter. Card actions that appear on hover on a desktop are always visible on touch screens (`pointer-coarse:`), since there is no hover. Dialogs fill the phone viewport with the toolbar wrapping to two rows, and the top bar tightens its spacing so the search field keeps its width.

**Drag-and-drop ordering.** Cards can be dragged into any order with the mouse, by touch (press and hold), or from the keyboard (focus a card, Space to pick up, arrows to move, Space to drop), using [dnd-kit](https://dndkit.com). Each note has a `position`; the grid sorts pinned notes first and then by position, so editing a note no longer moves it. A drop sends one `POST /notes/reorder` with the full id order, applied optimistically with rollback. Dropping a note into the pinned group pins it, and pinning from the card or dialog puts the note at the top of its new group. Dragging is disabled while a search filter is active, because reordering a partial list would scramble the hidden notes. The layout is a CSS grid with top-aligned rows rather than a true masonry, since column-flow masonry and drag transforms do not mix.

**TanStack Query for server state, Context for UI state.** Notes are server data, so they live in the query cache with automatic refetching and invalidation. The search string and "which editor is open" are purely client concerns, so they live in a small Context (`NotesUIProvider`). Keeping these separate avoids the common trap of mirroring server data into a global store and then fighting to keep it in sync.

**Optimistic mutations.** Each create/update/delete hook in `useNotes.ts` snapshots the cache, patches it immediately, rolls back on error, and invalidates on settle. New notes get a negative temporary id so they can't collide with server ids, and the card renders them dimmed until the server confirms.

**Error handling.** A thin `request()` wrapper turns non-2xx responses and network failures into `ApiError` with a readable message. The dashboard shows a skeleton grid while loading, a retry banner if the initial fetch fails, and a dismissable banner if any mutation is rejected after rollback.

**Schema evolution without Alembic.** Notes gained `color`, `pinned` and `updated_at` after the first release. `store.migrate()` creates the table if needed and then adds any missing columns with plain `ALTER TABLE` statements, backfilling timestamps, so an existing Supabase table upgrades itself on the next start. Alembic would be the right tool once there are more than a handful of changes; for three columns it would be more ceremony than value.

**Backend changes from the starter.** The provided template had the client supply ids, returned 200 with an error body for a missing note, and had no CORS. This version assigns ids server-side, returns 404/422 properly, validates that titles are non-empty, and uses 201/204 status codes.

**Storage behind a small interface.** `store.py` defines a `NoteStore` protocol with two implementations: `InMemoryNoteStore` (a lock-guarded dict) and `SqlNoteStore` (SQLModel on top of SQLAlchemy). `create_store()` picks one from `DATABASE_URL` at startup and the route handlers receive it through FastAPI's dependency injection, so the API code never knows which backend it has. Supabase is just Postgres, so there is no Supabase-specific client; the same URL mechanism works for a local Postgres or SQLite, and a reviewer without Supabase credentials can still run everything. The API schema (`Note`) is deliberately separate from the table model (`NoteRow`) so the two can evolve independently.

**Tests run against both stores.** The pytest `client` fixture is parametrised over the in-memory store and an in-memory SQLite `SqlNoteStore`, so the SQL path is covered on every run without a database server.

**Tailwind v4** via the Vite plugin. No config file needed.

**Vitest + React Testing Library.** Same API as Jest, but native to Vite so there's no second build pipeline.

## Stretch features

- **Rich-text editor** with bubble toolbar, slash commands, checklists, code blocks, links and highlights.
- **Labels** with sidebar filtering and inline creation; **grid/list view** toggle.
- **Archive and Trash** shelves with restore, delete forever, empty trash and a seven-day purge.
- **Accounts**: sign-up and sign-in with hashed passwords, cookie sessions, per-user data and login rate limiting.
- **Drag-and-drop reordering** with mouse, touch and keyboard, persisted per note.
- **Colours, pinning, autosave, undo-delete, dark mode, keyboard shortcuts** (⌘K search, ⌘S save, Esc to close, `/` for blocks).
- **Search**: filters by title or the plain text of the content, case-insensitive, with an empty state for no matches.
- **Optimistic UI**: create, update, pin and delete, with rollback.
- **Tests**: `NoteCard.test.tsx` covers rendering, callbacks, disabled state, and the empty-content placeholder. The backend has `pytest` coverage for the CRUD round trip, ordering, 404s, and validation, run against both store implementations.
- **Persistence**: Postgres via Supabase (or any Postgres/SQLite) through `DATABASE_URL`, with automatic table creation and an in-memory fallback.
- **Keyboard and accessibility**: Escape closes the modal, dialog has `aria-modal` and a labelled title, loading and busy states are announced.

## Deploying to Vercel

One Vercel project serves both halves from the same domain, so the frontend keeps calling `/api` and no CORS configuration is needed.

- `api/index.py` mounts the FastAPI app under `/api`; Vercel runs it as a Python serverless function.
- `vercel.json` rewrites `/api/*` to that function.
- `requirements.txt` at the repo root is what Vercel installs for the function.
- `vercel.json` pins the function to Sydney (`syd1`), the same region as the Supabase project. Change it if your database lives elsewhere: a function in Virginia talking to a database in Sydney spent ~2 s per request on connection setup alone.
- When `VERCEL` is set, the engine keeps a single pooled connection alive between warm invocations (`pool_size=1`, recycled every 4 minutes, pre-pinged) and disables server-side prepared statements so it works through a transaction-mode pooler.

Import the repo in Vercel and use these settings:

| Setting | Value |
| --- | --- |
| Framework Preset | Other |
| Root Directory | `./` |
| Build Command | `cd frontend && npm ci && npm run build` |
| Output Directory | `frontend/dist` |
| Environment Variables | `DATABASE_URL` = Supabase **Transaction pooler** string (port 6543); `SECRET_KEY` = a long random string (see above) |

Use the transaction pooler rather than the session pooler for serverless: functions open many short-lived connections, and session mode would exhaust the pool. Without `DATABASE_URL` the function falls back to the in-memory store, which resets on every cold start, so set it before relying on the deployment.

## Adapting to React Native

The split between data and presentation is the part that carries over. `api/`, `hooks/useNotes.ts`, and the Context would move unchanged into a shared package; TanStack Query works on React Native out of the box, and `fetch` is available. The pieces that change:

- **Components**: swap `div`/`button`/`input` for `View`, `Pressable`, `TextInput`, and the grid for a `FlatList` with `numColumns={2}`. Tailwind classes become NativeWind classes or `StyleSheet` objects.
- **Editor**: TipTap has no React Native build. The practical options are a WebView hosting the same TipTap bundle (10tap-editor wraps exactly this and bridges the toolbar to native), or a native rich-text component with a reduced feature set. Because content is HTML, either reads and writes the same data.
- **Modal**: use React Native's `Modal` component or a bottom sheet; the Escape-key handler goes away in favour of the hardware back button on Android.
- **Confirm dialog**: `window.confirm` becomes `Alert.alert` with Cancel/Delete buttons.
- **Networking**: the Vite proxy doesn't exist, so `VITE_API_URL` becomes an absolute URL, and on Android emulator `localhost` is `10.0.2.2`.
- **Offline**: TanStack Query's `persistQueryClient` with AsyncStorage would give the app a cached list on launch, and `onlineManager` plus `NetInfo` would pause mutations until connectivity returns.
