"""Draftify API.

A small FastAPI service backing Draftify. Storage is chosen at startup: set
``DATABASE_URL`` (for example a Supabase Postgres connection string) to persist
notes, or leave it unset to use an in-memory store. Every request past
``/auth`` needs a session cookie; see ``auth.py``.
"""

import logging
import os
import uuid
from collections.abc import Iterator
from contextlib import asynccontextmanager
from typing import Annotated

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from auth import (
    CurrentUser, clear_session_cookie, hash_password, login_limiter, secret_key,
    set_session_cookie, verify_password,
)
from models import Credentials, Label, LabelIn, Note, NoteIn, ReorderIn, User
from store import DuplicateEmail, DuplicateLabel, NoteStore, UnknownLabel, ensure_store

load_dotenv()
log = logging.getLogger("draftify")


@asynccontextmanager
async def lifespan(app: FastAPI):
    secret_key()  # fail fast in production if SECRET_KEY is missing
    ensure_store(app)
    yield


DESCRIPTION = """
Draftify is a Keep-style notes app with a rich-text editor. This API backs it.

## Sessions

Sign up or log in and the server sets an **HTTP-only session cookie**
(`draftify_session`, 7 days). Every endpoint outside `/auth` requires it and
returns `401` without it. In this UI, call **POST /auth/login** first and the
cookie is kept for the other calls.

## Ownership

Notes and labels belong to the signed-in user. Another user's ids behave as if
they do not exist (`404`), including inside `label_ids` (`422`).

## Ordering

`GET /notes` returns every note (active, archived and trashed) sorted pinned
first, then by `position`. Clients filter by `archived` / `deleted_at`.
New notes take the top slot; pinning moves a note to the top of its group;
**POST /notes/reorder** persists a drag-and-drop order in one call.
"""

TAGS = [
    {"name": "auth", "description": "Sign up, sign in, sign out and the current session."},
    {"name": "notes", "description": "Create, edit, order, archive and trash notes. All scoped to the signed-in user."},
    {"name": "labels", "description": "Per-user labels that can be attached to notes."},
]

app = FastAPI(
    title="Draftify API",
    version="0.5.0",
    description=DESCRIPTION,
    openapi_tags=TAGS,
    lifespan=lifespan,
    swagger_ui_parameters={"defaultModelsExpandDepth": -1, "tryItOutEnabled": True},
)

UNAUTHORIZED = {401: {"description": "No valid session cookie"}}
NOT_FOUND = {404: {"description": "Not found, or owned by another user"}}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_store(request: Request) -> Iterator[NoteStore]:
    yield ensure_store(request.app)


Store = Annotated[NoteStore, Depends(get_store)]


def _not_found(note_id: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail=f"Note {note_id} not found"
    )


@app.exception_handler(Exception)
async def _unhandled(request: Request, exc: Exception):
    """Log the traceback with an id and return that id to the client, so a user-
    reported failure can be matched to a server log line."""
    error_id = uuid.uuid4().hex[:8]
    log.exception("unhandled error %s on %s %s", error_id, request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Something went wrong on the server (error {error_id})"},
    )


@app.exception_handler(UnknownLabel)
async def _unknown_label(_: Request, exc: UnknownLabel):
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content={"detail": str(exc)})


@app.exception_handler(DuplicateLabel)
async def _duplicate_label(_: Request, exc: DuplicateLabel):
    return JSONResponse(status_code=status.HTTP_409_CONFLICT, content={"detail": str(exc)})


# ---------------------------------------------------------------- auth


def _client_key(request: Request, email: str) -> str:
    host = request.client.host if request.client else "unknown"
    return f"{host}:{email.lower()}"


@app.post(
    "/auth/signup",
    response_model=User,
    status_code=status.HTTP_201_CREATED,
    tags=["auth"],
    summary="Create an account",
    responses={409: {"description": "An account with this email already exists"}},
)
def signup(data: Credentials, request: Request, response: Response, store: Store) -> User:
    """Create an account and sign in (the session cookie is set on the response).

    Emails are unique regardless of case. Passwords need at least 8 characters
    and are stored as Argon2 hashes. The very first account adopts any notes
    and labels that predate accounts.
    """
    email = data.email.strip().lower()
    try:
        user = store.create_user(email, hash_password(data.password))
    except DuplicateEmail:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="An account with this email already exists")
    if user.id == 1:
        store.claim_orphans(user.id)
    set_session_cookie(response, request, user.id)
    return user


@app.post(
    "/auth/login",
    response_model=User,
    tags=["auth"],
    summary="Sign in",
    responses={401: {"description": "Incorrect email or password"}, 429: {"description": "Too many failed attempts; wait a few minutes"}},
)
def login(data: Credentials, request: Request, response: Response, store: Store) -> User:
    """Sign in and receive the session cookie. The error is the same whether the
    email or the password is wrong, and attempts are rate-limited per client."""
    key = _client_key(request, data.email)
    if login_limiter.blocked(key):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts, try again later")
    found = store.find_user(data.email.strip())
    # Same message whether the email or the password is wrong.
    if found is None or not verify_password(data.password, found[1]):
        login_limiter.record_failure(key)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    login_limiter.reset(key)
    user = found[0]
    set_session_cookie(response, request, user.id)
    return user


@app.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT, tags=["auth"], summary="Sign out")
def logout(response: Response) -> None:
    """Clear the session cookie."""
    clear_session_cookie(response)


@app.get("/auth/me", response_model=User, tags=["auth"], summary="Current user", responses=UNAUTHORIZED)
def me(user: CurrentUser) -> User:
    """The signed-in user, or 401 when there is no valid session."""
    return user


# ---------------------------------------------------------------- labels


@app.get("/labels", response_model=list[Label], tags=["labels"], summary="List labels", responses=UNAUTHORIZED)
def list_labels(user: CurrentUser, store: Store) -> list[Label]:
    return store.list_labels(user.id)


@app.post(
    "/labels",
    response_model=Label,
    status_code=status.HTTP_201_CREATED,
    tags=["labels"],
    summary="Create a label",
    responses={**UNAUTHORIZED, 409: {"description": "You already have a label with this name"}},
)
def create_label(data: LabelIn, user: CurrentUser, store: Store) -> Label:
    return store.create_label(user.id, data)


@app.put(
    "/labels/{label_id}",
    response_model=Label,
    tags=["labels"],
    summary="Rename a label",
    responses={**UNAUTHORIZED, **NOT_FOUND, 409: {"description": "You already have a label with this name"}},
)
def rename_label(label_id: int, data: LabelIn, user: CurrentUser, store: Store) -> Label:
    label = store.rename_label(user.id, label_id, data)
    if label is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"Label {label_id} not found")
    return label


@app.delete(
    "/labels/{label_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["labels"],
    summary="Delete a label",
    responses={**UNAUTHORIZED, **NOT_FOUND},
)
def delete_label(label_id: int, user: CurrentUser, store: Store) -> None:
    if not store.delete_label(user.id, label_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"Label {label_id} not found")


# ---------------------------------------------------------------- notes


@app.get("/notes", response_model=list[Note], tags=["notes"], summary="List notes", responses=UNAUTHORIZED)
def list_notes(user: CurrentUser, store: Store) -> list[Note]:
    """Every note of the signed-in user, in display order (pinned first, then
    `position`). Archived and trashed notes are included with their flags set;
    trashed notes older than seven days are purged first."""
    return store.list(user.id)


@app.post(
    "/notes/reorder",
    response_model=list[Note],
    tags=["notes"],
    summary="Reorder notes",
    responses={**UNAUTHORIZED, 404: {"description": "One or more ids are unknown or not yours"}},
)
def reorder_notes(data: ReorderIn, user: CurrentUser, store: Store) -> list[Note]:
    """Persist a drag-and-drop order: the ids are assigned positions 0..n-1 in
    the given order. Returns every note in the new display order."""
    notes = store.reorder(user.id, data.ids)
    if notes is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="One or more notes not found")
    return notes


@app.delete("/notes/trash", status_code=status.HTTP_204_NO_CONTENT, tags=["notes"], summary="Empty the trash", responses=UNAUTHORIZED)
def empty_trash(user: CurrentUser, store: Store) -> None:
    """Permanently delete every note in the trash."""
    store.empty_trash(user.id)


@app.get("/notes/{note_id}", response_model=Note, tags=["notes"], summary="Get a note", responses={**UNAUTHORIZED, **NOT_FOUND})
def get_note(note_id: int, user: CurrentUser, store: Store) -> Note:
    note = store.get(user.id, note_id)
    if note is None:
        raise _not_found(note_id)
    return note


@app.post(
    "/notes",
    response_model=Note,
    status_code=status.HTTP_201_CREATED,
    tags=["notes"],
    summary="Create a note",
    responses={**UNAUTHORIZED, 422: {"description": "Invalid payload or a label id that is not yours"}},
)
def create_note(data: NoteIn, user: CurrentUser, store: Store) -> Note:
    """Create a note at the top of the wall. `content` is HTML from the editor."""
    return store.create(user.id, data)


@app.put(
    "/notes/{note_id}",
    response_model=Note,
    tags=["notes"],
    summary="Replace a note",
    responses={**UNAUTHORIZED, **NOT_FOUND, 422: {"description": "Invalid payload or a label id that is not yours"}},
)
def update_note(note_id: int, data: NoteIn, user: CurrentUser, store: Store) -> Note:
    """Full replacement of the editable fields. Pinning or unpinning moves the
    note to the top of its new group; archiving unpins it."""
    note = store.update(user.id, note_id, data)
    if note is None:
        raise _not_found(note_id)
    return note


@app.delete(
    "/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["notes"],
    summary="Trash or delete a note",
    responses={**UNAUTHORIZED, **NOT_FOUND},
)
def delete_note(note_id: int, user: CurrentUser, store: Store, permanent: bool = False) -> None:
    """Move a note to the trash (restorable for seven days), or delete it for
    good with `?permanent=true`."""
    if permanent:
        if not store.delete(user.id, note_id):
            raise _not_found(note_id)
    elif store.trash(user.id, note_id) is None:
        raise _not_found(note_id)


@app.post("/notes/{note_id}/restore", response_model=Note, tags=["notes"], summary="Restore from trash", responses={**UNAUTHORIZED, **NOT_FOUND})
def restore_note(note_id: int, user: CurrentUser, store: Store) -> Note:
    note = store.restore(user.id, note_id)
    if note is None:
        raise _not_found(note_id)
    return note
