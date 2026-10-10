"""Draftify API.

A small FastAPI service backing Draftify. Storage is chosen at
startup: set ``DATABASE_URL`` (for example a Supabase Postgres connection
string) to persist notes, or leave it unset to use an in-memory store.
"""

import os
from collections.abc import Iterator
from contextlib import asynccontextmanager
from typing import Annotated

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import Label, LabelIn, Note, NoteIn, ReorderIn
from store import DuplicateLabel, NoteStore, UnknownLabel, create_store

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
    _ensure_store(app)
    yield


app = FastAPI(title="Draftify API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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


# ---------------------------------------------------------------- labels


@app.get("/labels", response_model=list[Label])
def list_labels(store: Store) -> list[Label]:
    return store.list_labels()


@app.post("/labels", response_model=Label, status_code=status.HTTP_201_CREATED)
def create_label(data: LabelIn, store: Store) -> Label:
    return store.create_label(data)


@app.put("/labels/{label_id}", response_model=Label)
def rename_label(label_id: int, data: LabelIn, store: Store) -> Label:
    label = store.rename_label(label_id, data)
    if label is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"Label {label_id} not found")
    return label


@app.delete("/labels/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_label(label_id: int, store: Store) -> None:
    if not store.delete_label(label_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"Label {label_id} not found")


# ---------------------------------------------------------------- notes


@app.get("/notes", response_model=list[Note])
def list_notes(store: Store) -> list[Note]:
    return store.list()


@app.post("/notes/reorder", response_model=list[Note])
def reorder_notes(data: ReorderIn, store: Store) -> list[Note]:
    """Persist a drag-and-drop order. Returns every note in display order."""
    notes = store.reorder(data.ids)
    if notes is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="One or more notes not found")
    return notes


@app.get("/notes/{note_id}", response_model=Note)
def get_note(note_id: int, store: Store) -> Note:
    note = store.get(note_id)
    if note is None:
        raise _not_found(note_id)
    return note


@app.post("/notes", response_model=Note, status_code=status.HTTP_201_CREATED)
def create_note(data: NoteIn, store: Store) -> Note:
    return store.create(data)


@app.put("/notes/{note_id}", response_model=Note)
def update_note(note_id: int, data: NoteIn, store: Store) -> Note:
    note = store.update(note_id, data)
    if note is None:
        raise _not_found(note_id)
    return note


@app.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: int, store: Store) -> None:
    if not store.delete(note_id):
        raise _not_found(note_id)
