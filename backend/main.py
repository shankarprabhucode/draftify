"""Notes API.

A small FastAPI service backing the Notes Dashboard. Storage is chosen at
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

from models import Note, NoteIn
from store import NoteStore, create_store

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.store = create_store(os.getenv("DATABASE_URL"))
    yield


app = FastAPI(title="Notes API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_store(request: Request) -> Iterator[NoteStore]:
    yield request.app.state.store


Store = Annotated[NoteStore, Depends(get_store)]


def _not_found(note_id: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail=f"Note {note_id} not found"
    )


@app.get("/notes", response_model=list[Note])
def list_notes(store: Store) -> list[Note]:
    return store.list()


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
