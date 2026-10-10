"""Note storage.

Two implementations share one interface:

* ``InMemoryNoteStore`` - a dict guarded by a lock. Zero setup, lost on restart.
* ``SqlNoteStore`` - any SQLAlchemy-supported database via SQLModel. Used when
  ``DATABASE_URL`` is set (for example a Supabase Postgres connection string).
"""

import os
from itertools import count
from threading import Lock
from typing import Protocol

from sqlalchemy import Engine, inspect, text
from sqlalchemy.pool import NullPool, StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from models import Note, NoteIn, NoteRow, utcnow


class NoteStore(Protocol):
    def list(self) -> list[Note]: ...
    def get(self, note_id: int) -> Note | None: ...
    def create(self, data: NoteIn) -> Note: ...
    def update(self, note_id: int, data: NoteIn) -> Note | None: ...
    def delete(self, note_id: int) -> bool: ...
    def clear(self) -> None: ...


class InMemoryNoteStore:
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
            note = Note(id=next(self._ids), updated_at=utcnow(), **data.model_dump())
            self._notes[note.id] = note
            return note

    def update(self, note_id: int, data: NoteIn) -> Note | None:
        with self._lock:
            if note_id not in self._notes:
                return None
            note = Note(id=note_id, updated_at=utcnow(), **data.model_dump())
            self._notes[note_id] = note
            return note

    def delete(self, note_id: int) -> bool:
        with self._lock:
            return self._notes.pop(note_id, None) is not None

    def clear(self) -> None:
        with self._lock:
            self._notes.clear()
            self._ids = count(1)


# Columns added after the first release, with the SQL default for existing rows.
# ``create_all`` only creates missing tables, so missing columns are added here.
# SQLite cannot add a column whose default is an expression, so timestamps are
# added nullable and backfilled instead.
_ADDED_COLUMNS: dict[str, tuple[str, str | None]] = {
    "color": ("VARCHAR(16) NOT NULL DEFAULT 'default'", None),
    "pinned": ("BOOLEAN NOT NULL DEFAULT FALSE", None),
    "updated_at": ("TIMESTAMP", "UPDATE notes SET updated_at = CURRENT_TIMESTAMP"),
}


def migrate(engine: Engine) -> list[str]:
    """Create the table and add any columns introduced since. Returns what was added."""
    SQLModel.metadata.create_all(engine)
    existing = {c["name"] for c in inspect(engine).get_columns("notes")}
    added = []
    with engine.begin() as conn:
        for name, (ddl, backfill) in _ADDED_COLUMNS.items():
            if name not in existing:
                conn.execute(text(f"ALTER TABLE notes ADD COLUMN {name} {ddl}"))
                if backfill:
                    conn.execute(text(backfill))
                added.append(name)
    return added


class SqlNoteStore:
    """SQLModel-backed store. Creates or migrates the ``notes`` table on start."""

    def __init__(self, engine: Engine) -> None:
        self._engine = engine
        migrate(engine)

    def list(self) -> list[Note]:
        with Session(self._engine) as session:
            rows = session.exec(select(NoteRow).order_by(NoteRow.id)).all()
            return [row.to_note() for row in rows]

    def get(self, note_id: int) -> Note | None:
        with Session(self._engine) as session:
            row = session.get(NoteRow, note_id)
            return row.to_note() if row else None

    def create(self, data: NoteIn) -> Note:
        with Session(self._engine) as session:
            row = NoteRow(**data.model_dump())
            session.add(row)
            session.commit()
            session.refresh(row)
            return row.to_note()

    def update(self, note_id: int, data: NoteIn) -> Note | None:
        with Session(self._engine) as session:
            row = session.get(NoteRow, note_id)
            if row is None:
                return None
            row.title = data.title
            row.content = data.content
            row.color = data.color
            row.pinned = data.pinned
            row.updated_at = utcnow()
            session.add(row)
            session.commit()
            session.refresh(row)
            return row.to_note()

    def delete(self, note_id: int) -> bool:
        with Session(self._engine) as session:
            row = session.get(NoteRow, note_id)
            if row is None:
                return False
            session.delete(row)
            session.commit()
            return True

    def clear(self) -> None:
        with Session(self._engine) as session:
            for row in session.exec(select(NoteRow)).all():
                session.delete(row)
            session.commit()


def _normalise_url(url: str) -> str:
    """Route plain ``postgres://`` / ``postgresql://`` URLs through psycopg 3."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix) :]
    return url


def make_engine(url: str) -> Engine:
    url = _normalise_url(url)
    if url.startswith("sqlite"):
        # Let the in-memory SQLite database be shared across threads (tests).
        return create_engine(
            url, connect_args={"check_same_thread": False}, poolclass=StaticPool
        )

    # Transaction-mode poolers (Supabase port 6543, PgBouncer) reject server-side
    # prepared statements, so turn them off. Costs little with a session pooler.
    connect_args = {"prepare_threshold": None}

    if os.getenv("VERCEL"):
        # Serverless: open a connection per request and let the pooler do the pooling.
        return create_engine(url, connect_args=connect_args, poolclass=NullPool)
    return create_engine(url, connect_args=connect_args, pool_pre_ping=True)


def create_store(database_url: str | None) -> NoteStore:
    """Pick a store from configuration: SQL when a URL is given, memory otherwise."""
    if database_url:
        return SqlNoteStore(make_engine(database_url))
    return InMemoryNoteStore()
