"""Notes API.

A small FastAPI service backing the Notes Dashboard. Notes live in memory
and are lost on restart, which is fine for this exercise. The service assigns
ids server-side, returns proper 404s, and allows CORS from the Vite dev server.
"""

from itertools import count
from threading import Lock

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Notes API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class NoteIn(BaseModel):
    """Payload accepted on create and update. The server owns the id."""

    title: str = Field(min_length=1, max_length=200)
    content: str = Field(default="", max_length=10_000)


class Note(NoteIn):
    id: int


class NoteStore:
    """Thread-safe in-memory store. Preserves insertion order."""

    def __init__(self) -> None:
        self._notes: dict[int, Note] = {}
        self._ids = count(1)
        self._lock = Lock()

    def list(self) -> list[Note]:
        with self._lock:
            return list(self._notes.values())

    def get(self, note_id: int) -> Note | None:
        with self._lock:
            return self._notes.get(note_id)

    def create(self, data: NoteIn) -> Note:
        with self._lock:
            note = Note(id=next(self._ids), **data.model_dump())
            self._notes[note.id] = note
            return note

    def update(self, note_id: int, data: NoteIn) -> Note | None:
        with self._lock:
            if note_id not in self._notes:
                return None
            note = Note(id=note_id, **data.model_dump())
            self._notes[note_id] = note
            return note

    def delete(self, note_id: int) -> bool:
        with self._lock:
            return self._notes.pop(note_id, None) is not None

    def clear(self) -> None:
        with self._lock:
            self._notes.clear()
            self._ids = count(1)


store = NoteStore()


def _not_found(note_id: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail=f"Note {note_id} not found"
    )


@app.get("/notes", response_model=list[Note])
def list_notes() -> list[Note]:
    return store.list()


@app.get("/notes/{note_id}", response_model=Note)
def get_note(note_id: int) -> Note:
    note = store.get(note_id)
    if note is None:
        raise _not_found(note_id)
    return note


@app.post("/notes", response_model=Note, status_code=status.HTTP_201_CREATED)
def create_note(data: NoteIn) -> Note:
    return store.create(data)


@app.put("/notes/{note_id}", response_model=Note)
def update_note(note_id: int, data: NoteIn) -> Note:
    note = store.update(note_id, data)
    if note is None:
        raise _not_found(note_id)
    return note


@app.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: int) -> None:
    if not store.delete(note_id):
        raise _not_found(note_id)
