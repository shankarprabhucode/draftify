"""Draftify API.

A small FastAPI service backing Draftify. Storage is chosen at startup: set
``DATABASE_URL`` (for example a Supabase Postgres connection string) to persist
notes, or leave it unset to use an in-memory store. Every request past
``/auth`` needs a session cookie; see ``auth.py``.
"""

import os
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
from store import DuplicateEmail, DuplicateLabel, NoteStore, UnknownLabel, create_store

load_dotenv()


def _ensure_store(app: FastAPI) -> NoteStore:
    """Create the store on first use. Lifespan normally does this at startup, but
    some serverless hosts skip lifespan events, so the dependency can do it too."""
    store = getattr(app.state, "store", None)
    if store is None:
        store = app.state.store = create_store(os.getenv("DATABASE_URL"))
    return store


@asynccontextmanager
async def lifespan(app: FastAPI):
    secret_key()  # fail fast in production if SECRET_KEY is missing
    _ensure_store(app)
    yield


app = FastAPI(title="Draftify API", version="0.4.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_store(request: Request) -> Iterator[NoteStore]:
    yield _ensure_store(request.app)


Store = Annotated[NoteStore, Depends(get_store)]


def _not_found(note_id: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail=f"Note {note_id} not found"
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


@app.post("/auth/signup", response_model=User, status_code=status.HTTP_201_CREATED)
def signup(data: Credentials, request: Request, response: Response, store: Store) -> User:
    """Create an account and sign in. The first account adopts any notes that
    predate accounts (data from before auth was added)."""
    email = data.email.strip().lower()
    try:
        user = store.create_user(email, hash_password(data.password))
    except DuplicateEmail:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="An account with this email already exists")
    if user.id == 1:
        store.claim_orphans(user.id)
    set_session_cookie(response, request, user.id)
    return user


@app.post("/auth/login", response_model=User)
def login(data: Credentials, request: Request, response: Response, store: Store) -> User:
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


@app.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    clear_session_cookie(response)


@app.get("/auth/me", response_model=User)
def me(user: CurrentUser) -> User:
    return user


# ---------------------------------------------------------------- labels


@app.get("/labels", response_model=list[Label])
def list_labels(user: CurrentUser, store: Store) -> list[Label]:
    return store.list_labels(user.id)


@app.post("/labels", response_model=Label, status_code=status.HTTP_201_CREATED)
def create_label(data: LabelIn, user: CurrentUser, store: Store) -> Label:
    return store.create_label(user.id, data)


@app.put("/labels/{label_id}", response_model=Label)
def rename_label(label_id: int, data: LabelIn, user: CurrentUser, store: Store) -> Label:
    label = store.rename_label(user.id, label_id, data)
    if label is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"Label {label_id} not found")
    return label


@app.delete("/labels/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_label(label_id: int, user: CurrentUser, store: Store) -> None:
    if not store.delete_label(user.id, label_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"Label {label_id} not found")


# ---------------------------------------------------------------- notes


@app.get("/notes", response_model=list[Note])
def list_notes(user: CurrentUser, store: Store) -> list[Note]:
    return store.list(user.id)


@app.post("/notes/reorder", response_model=list[Note])
def reorder_notes(data: ReorderIn, user: CurrentUser, store: Store) -> list[Note]:
    """Persist a drag-and-drop order. Returns every note in display order."""
    notes = store.reorder(user.id, data.ids)
    if notes is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="One or more notes not found")
    return notes


@app.delete("/notes/trash", status_code=status.HTTP_204_NO_CONTENT)
def empty_trash(user: CurrentUser, store: Store) -> None:
    """Permanently delete every note in the trash."""
    store.empty_trash(user.id)


@app.get("/notes/{note_id}", response_model=Note)
def get_note(note_id: int, user: CurrentUser, store: Store) -> Note:
    note = store.get(user.id, note_id)
    if note is None:
        raise _not_found(note_id)
    return note


@app.post("/notes", response_model=Note, status_code=status.HTTP_201_CREATED)
def create_note(data: NoteIn, user: CurrentUser, store: Store) -> Note:
    return store.create(user.id, data)


@app.put("/notes/{note_id}", response_model=Note)
def update_note(note_id: int, data: NoteIn, user: CurrentUser, store: Store) -> Note:
    note = store.update(user.id, note_id, data)
    if note is None:
        raise _not_found(note_id)
    return note


@app.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: int, user: CurrentUser, store: Store, permanent: bool = False) -> None:
    """Move a note to the trash, or delete it for good with ``?permanent=true``."""
    if permanent:
        if not store.delete(user.id, note_id):
            raise _not_found(note_id)
    elif store.trash(user.id, note_id) is None:
        raise _not_found(note_id)


@app.post("/notes/{note_id}/restore", response_model=Note)
def restore_note(note_id: int, user: CurrentUser, store: Store) -> Note:
    note = store.restore(user.id, note_id)
    if note is None:
        raise _not_found(note_id)
    return note
