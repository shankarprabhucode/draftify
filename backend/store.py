"""Note, label and user storage.

Two implementations share one interface:

* ``InMemoryNoteStore`` - dicts guarded by a lock. Zero setup, lost on restart.
* ``SqlNoteStore`` - any SQLAlchemy-supported database via SQLModel. Used when
  ``DATABASE_URL`` is set (for example a Supabase Postgres connection string).

Every note and label belongs to a user. All note/label methods take the
owner's id and only ever see that user's rows, so authorisation lives here
rather than in each route.
"""

from __future__ import annotations

import os
from datetime import datetime
from itertools import count
from threading import Lock
from typing import Protocol

from sqlalchemy import Engine, inspect, text
from sqlalchemy.orm import selectinload
from sqlalchemy.pool import QueuePool, StaticPool
from sqlmodel import Session, SQLModel, create_engine, func, select

from models import (
    TRASH_RETENTION, Label, LabelIn, LabelRow, Note, NoteIn, NoteRow, User, UserRow, utcnow,
)


class UnknownLabel(ValueError):
    """Raised when a note references a label id that does not exist (for this user)."""


class DuplicateLabel(ValueError):
    """Raised when a label name is already taken (case-insensitive) for this user."""


class DuplicateEmail(ValueError):
    """Raised when an account with this email already exists."""


class NoteStore(Protocol):
    # users
    def create_user(self, email: str, password_hash: str) -> User: ...
    def get_user(self, user_id: int) -> User | None: ...
    def find_user(self, email: str) -> tuple[User, str] | None:
        """Return the user and password hash for an email (case-insensitive)."""
        ...

    def claim_orphans(self, user_id: int) -> int:
        """Give notes/labels created before accounts existed to this user. Returns count."""
        ...

    # notes
    def list(self, user_id: int) -> list[Note]: ...
    def get(self, user_id: int, note_id: int) -> Note | None: ...
    def create(self, user_id: int, data: NoteIn) -> Note: ...
    def update(self, user_id: int, note_id: int, data: NoteIn) -> Note | None: ...
    def trash(self, user_id: int, note_id: int) -> Note | None: ...
    def restore(self, user_id: int, note_id: int) -> Note | None: ...
    def delete(self, user_id: int, note_id: int) -> bool: ...
    def empty_trash(self, user_id: int) -> int: ...
    def reorder(self, user_id: int, ids: list[int]) -> list[Note] | None: ...

    # labels
    def list_labels(self, user_id: int) -> list[Label]: ...
    def create_label(self, user_id: int, data: LabelIn) -> Label: ...
    def rename_label(self, user_id: int, label_id: int, data: LabelIn) -> Label | None: ...
    def delete_label(self, user_id: int, label_id: int) -> bool: ...
    def clear(self) -> None: ...


def _display_order(note: Note) -> tuple[bool, int, int]:
    """Pinned first, then by position, newest first among equals."""
    return (not note.pinned, note.position, -note.id)


def _by_name(label: Label) -> str:
    return label.name.lower()


def _purge_before() -> datetime:
    return utcnow() - TRASH_RETENTION


# ---------------------------------------------------------------- in-memory


class _MemNote:
    __slots__ = ("note", "user_id")

    def __init__(self, note: Note, user_id: int | None) -> None:
        self.note = note
        self.user_id = user_id


class _MemUser:
    __slots__ = ("user", "password_hash")

    def __init__(self, user: User, password_hash: str) -> None:
        self.user = user
        self.password_hash = password_hash


class InMemoryNoteStore:
    """Thread-safe in-memory store."""

    def __init__(self) -> None:
        self._notes: dict[int, _MemNote] = {}
        self._labels: dict[int, tuple[Label, int | None]] = {}
        self._users: dict[int, _MemUser] = {}
        self._ids = count(1)
        self._label_ids = count(1)
        self._user_ids = count(1)
        self._lock = Lock()

    # users

    def create_user(self, email: str, password_hash: str) -> User:
        with self._lock:
            if any(u.user.email.lower() == email.lower() for u in self._users.values()):
                raise DuplicateEmail(email)
            user = User(id=next(self._user_ids), email=email, created_at=utcnow())
            self._users[user.id] = _MemUser(user, password_hash)
            return user

    def get_user(self, user_id: int) -> User | None:
        with self._lock:
            entry = self._users.get(user_id)
            return entry.user if entry else None

    def find_user(self, email: str) -> tuple[User, str] | None:
        with self._lock:
            for entry in self._users.values():
                if entry.user.email.lower() == email.lower():
                    return entry.user, entry.password_hash
            return None

    def claim_orphans(self, user_id: int) -> int:
        with self._lock:
            n = 0
            for entry in self._notes.values():
                if entry.user_id is None:
                    entry.user_id = user_id
                    n += 1
            for lid, (label, owner) in list(self._labels.items()):
                if owner is None:
                    self._labels[lid] = (label, user_id)
                    n += 1
            return n

    # helpers

    def _mine(self, user_id: int) -> list[Note]:
        return [e.note for e in self._notes.values() if e.user_id == user_id]

    def _entry(self, user_id: int, note_id: int) -> _MemNote | None:
        entry = self._notes.get(note_id)
        return entry if entry and entry.user_id == user_id else None

    def _top(self, user_id: int) -> int:
        """Position that sorts before every existing note."""
        return min((n.position for n in self._mine(user_id)), default=0) - 1

    def _resolve_labels(self, user_id: int, ids: list[int]) -> list[Label]:
        missing = [i for i in ids if i not in self._labels or self._labels[i][1] != user_id]
        if missing:
            raise UnknownLabel(f"Unknown label ids: {missing}")
        return sorted({i: self._labels[i][0] for i in ids}.values(), key=_by_name)

    def _fields(self, user_id: int, data: NoteIn) -> dict:
        return {
            "title": data.title,
            "content": data.content,
            "color": data.color,
            # Archived notes are never pinned (as in Keep).
            "pinned": data.pinned and not data.archived,
            "archived": data.archived,
            "labels": self._resolve_labels(user_id, data.label_ids),
        }

    def _purge(self) -> None:
        cutoff = _purge_before()
        for nid in [e.note.id for e in self._notes.values() if e.note.deleted_at and e.note.deleted_at < cutoff]:
            del self._notes[nid]

    # notes

    def list(self, user_id: int) -> list[Note]:
        with self._lock:
            self._purge()
            return sorted(self._mine(user_id), key=_display_order)

    def get(self, user_id: int, note_id: int) -> Note | None:
        with self._lock:
            entry = self._entry(user_id, note_id)
            return entry.note if entry else None

    def create(self, user_id: int, data: NoteIn) -> Note:
        with self._lock:
            note = Note(
                id=next(self._ids), position=self._top(user_id), updated_at=utcnow(), **self._fields(user_id, data)
            )
            self._notes[note.id] = _MemNote(note, user_id)
            return note

    def update(self, user_id: int, note_id: int, data: NoteIn) -> Note | None:
        with self._lock:
            entry = self._entry(user_id, note_id)
            if entry is None:
                return None
            current = entry.note
            fields = self._fields(user_id, data)
            # A note that is pinned or unpinned goes to the top of its new group.
            position = self._top(user_id) if fields["pinned"] != current.pinned else current.position
            entry.note = Note(
                id=note_id, position=position, updated_at=utcnow(), deleted_at=current.deleted_at, **fields
            )
            return entry.note

    def trash(self, user_id: int, note_id: int) -> Note | None:
        with self._lock:
            entry = self._entry(user_id, note_id)
            if entry is None:
                return None
            entry.note = entry.note.model_copy(update={"deleted_at": utcnow(), "pinned": False})
            return entry.note

    def restore(self, user_id: int, note_id: int) -> Note | None:
        with self._lock:
            entry = self._entry(user_id, note_id)
            if entry is None:
                return None
            entry.note = entry.note.model_copy(update={"deleted_at": None})
            return entry.note

    def delete(self, user_id: int, note_id: int) -> bool:
        with self._lock:
            if self._entry(user_id, note_id) is None:
                return False
            del self._notes[note_id]
            return True

    def empty_trash(self, user_id: int) -> int:
        with self._lock:
            trashed = [n.id for n in self._mine(user_id) if n.deleted_at]
            for nid in trashed:
                del self._notes[nid]
            return len(trashed)

    def reorder(self, user_id: int, ids: list[int]) -> list[Note] | None:
        with self._lock:
            if any(self._entry(user_id, i) is None for i in ids):
                return None
            for position, note_id in enumerate(ids):
                entry = self._notes[note_id]
                entry.note = entry.note.model_copy(update={"position": position})
            return sorted(self._mine(user_id), key=_display_order)

    # labels

    def _check_name(self, user_id: int, name: str, except_id: int | None = None) -> None:
        if any(
            owner == user_id and l.name.lower() == name.lower() and l.id != except_id
            for l, owner in self._labels.values()
        ):
            raise DuplicateLabel(f"Label '{name}' already exists")

    def list_labels(self, user_id: int) -> list[Label]:
        with self._lock:
            return sorted((l for l, owner in self._labels.values() if owner == user_id), key=_by_name)

    def create_label(self, user_id: int, data: LabelIn) -> Label:
        with self._lock:
            name = data.name.strip()
            self._check_name(user_id, name)
            label = Label(id=next(self._label_ids), name=name)
            self._labels[label.id] = (label, user_id)
            return label

    def rename_label(self, user_id: int, label_id: int, data: LabelIn) -> Label | None:
        with self._lock:
            entry = self._labels.get(label_id)
            if entry is None or entry[1] != user_id:
                return None
            name = data.name.strip()
            self._check_name(user_id, name, except_id=label_id)
            label = Label(id=label_id, name=name)
            self._labels[label_id] = (label, user_id)
            for e in self._notes.values():
                if any(l.id == label_id for l in e.note.labels):
                    labels = sorted([label if l.id == label_id else l for l in e.note.labels], key=_by_name)
                    e.note = e.note.model_copy(update={"labels": labels})
            return label

    def delete_label(self, user_id: int, label_id: int) -> bool:
        with self._lock:
            entry = self._labels.get(label_id)
            if entry is None or entry[1] != user_id:
                return False
            del self._labels[label_id]
            for e in self._notes.values():
                if any(l.id == label_id for l in e.note.labels):
                    e.note = e.note.model_copy(update={"labels": [l for l in e.note.labels if l.id != label_id]})
            return True

    def clear(self) -> None:
        with self._lock:
            self._notes.clear()
            self._labels.clear()
            self._users.clear()
            self._ids = count(1)
            self._label_ids = count(1)
            self._user_ids = count(1)


# ---------------------------------------------------------------- SQL

# Columns added after the first release, per table, with the SQL default for
# existing rows. ``create_all`` only creates missing tables, so missing columns
# are added here. SQLite cannot add a column whose default is an expression, so
# timestamps are added nullable and backfilled instead.
_ADDED_COLUMNS: dict[str, dict[str, tuple[str, str | None]]] = {
    "notes": {
        "color": ("VARCHAR(16) NOT NULL DEFAULT 'default'", None),
        "pinned": ("BOOLEAN NOT NULL DEFAULT FALSE", None),
        "updated_at": ("TIMESTAMP", "UPDATE notes SET updated_at = CURRENT_TIMESTAMP"),
        # Newest notes first for rows that predate manual ordering.
        "position": ("INTEGER NOT NULL DEFAULT 0", "UPDATE notes SET position = -id"),
        "archived": ("BOOLEAN NOT NULL DEFAULT FALSE", None),
        "deleted_at": ("TIMESTAMP", None),
        "user_id": ("INTEGER", None),
    },
    "labels": {
        "user_id": ("INTEGER", None),
    },
}


def migrate(engine: Engine) -> list[str]:
    """Create tables and add any columns introduced since. Returns what was added."""
    SQLModel.metadata.create_all(engine)
    # Inspect everything before opening the transaction: on SQLite's single shared
    # connection, inspecting mid-transaction would roll back the ALTERs so far.
    inspector = inspect(engine)
    existing = {table: {c["name"] for c in inspector.get_columns(table)} for table in _ADDED_COLUMNS}
    added = []
    with engine.begin() as conn:
        for table, columns in _ADDED_COLUMNS.items():
            for name, (ddl, backfill) in columns.items():
                if name not in existing[table]:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
                    if backfill:
                        conn.execute(text(backfill))
                    added.append(f"{table}.{name}")
        # Label names were globally unique before accounts; now unique per user.
        if engine.dialect.name == "postgresql":
            conn.execute(text("ALTER TABLE labels DROP CONSTRAINT IF EXISTS labels_name_key"))
    return added


_NOTES_WITH_LABELS = select(NoteRow).options(selectinload(NoteRow.labels))  # type: ignore[arg-type]


class SqlNoteStore:
    """SQLModel-backed store. Creates or migrates the tables on start."""

    def __init__(self, engine: Engine) -> None:
        self._engine = engine
        migrate(engine)

    # users

    def create_user(self, email: str, password_hash: str) -> User:
        with Session(self._engine) as session:
            if session.exec(select(UserRow).where(func.lower(UserRow.email) == email.lower())).first():
                raise DuplicateEmail(email)
            row = UserRow(email=email, password_hash=password_hash)
            session.add(row)
            session.commit()
            session.refresh(row)
            return row.to_user()

    def get_user(self, user_id: int) -> User | None:
        with Session(self._engine) as session:
            row = session.get(UserRow, user_id)
            return row.to_user() if row else None

    def find_user(self, email: str) -> tuple[User, str] | None:
        with Session(self._engine) as session:
            row = session.exec(select(UserRow).where(func.lower(UserRow.email) == email.lower())).first()
            return (row.to_user(), row.password_hash) if row else None

    def claim_orphans(self, user_id: int) -> int:
        with Session(self._engine) as session:
            n = 0
            for model in (NoteRow, LabelRow):
                for row in session.exec(select(model).where(model.user_id.is_(None))).all():  # type: ignore[union-attr]
                    row.user_id = user_id
                    session.add(row)
                    n += 1
            session.commit()
            return n

    # helpers

    def _all(self, session: Session, user_id: int) -> list[Note]:
        rows = session.exec(
            _NOTES_WITH_LABELS.where(NoteRow.user_id == user_id).order_by(
                NoteRow.pinned.desc(), NoteRow.position, NoteRow.id.desc()  # type: ignore[attr-defined]
            )
        ).all()
        return [row.to_note() for row in rows]

    def _row(self, session: Session, user_id: int, note_id: int) -> NoteRow | None:
        return session.exec(
            _NOTES_WITH_LABELS.where(NoteRow.id == note_id, NoteRow.user_id == user_id)
        ).first()

    def _top(self, session: Session, user_id: int) -> int:
        lowest = session.exec(select(func.min(NoteRow.position)).where(NoteRow.user_id == user_id)).one()
        return (lowest if lowest is not None else 0) - 1

    def _label_rows(self, session: Session, user_id: int, ids: list[int]) -> list[LabelRow]:
        if not ids:
            return []
        rows = session.exec(
            select(LabelRow).where(LabelRow.id.in_(ids), LabelRow.user_id == user_id)  # type: ignore[attr-defined]
        ).all()
        missing = set(ids) - {r.id for r in rows}
        if missing:
            raise UnknownLabel(f"Unknown label ids: {sorted(missing)}")
        return list(rows)

    def _purge(self, session: Session) -> None:
        cutoff = _purge_before()
        for row in session.exec(select(NoteRow).where(NoteRow.deleted_at < cutoff)).all():  # type: ignore[operator]
            session.delete(row)
        session.commit()

    # notes

    def list(self, user_id: int) -> list[Note]:
        with Session(self._engine) as session:
            self._purge(session)
            return self._all(session, user_id)

    def get(self, user_id: int, note_id: int) -> Note | None:
        with Session(self._engine) as session:
            row = self._row(session, user_id, note_id)
            return row.to_note() if row else None

    def create(self, user_id: int, data: NoteIn) -> Note:
        with Session(self._engine) as session:
            row = NoteRow(
                user_id=user_id,
                title=data.title,
                content=data.content,
                color=data.color,
                pinned=data.pinned and not data.archived,
                archived=data.archived,
                position=self._top(session, user_id),
                labels=self._label_rows(session, user_id, data.label_ids),
            )
            session.add(row)
            session.commit()
            session.refresh(row)
            return row.to_note()

    def update(self, user_id: int, note_id: int, data: NoteIn) -> Note | None:
        with Session(self._engine) as session:
            row = self._row(session, user_id, note_id)
            if row is None:
                return None
            pinned = data.pinned and not data.archived
            if pinned != row.pinned:
                row.position = self._top(session, user_id)
            row.title = data.title
            row.content = data.content
            row.color = data.color
            row.pinned = pinned
            row.archived = data.archived
            row.labels = self._label_rows(session, user_id, data.label_ids)
            row.updated_at = utcnow()
            session.add(row)
            session.commit()
            session.refresh(row)
            return row.to_note()

    def _set_deleted(self, user_id: int, note_id: int, value: datetime | None) -> Note | None:
        with Session(self._engine) as session:
            row = self._row(session, user_id, note_id)
            if row is None:
                return None
            row.deleted_at = value
            if value is not None:
                row.pinned = False
            session.add(row)
            session.commit()
            session.refresh(row)
            return row.to_note()

    def trash(self, user_id: int, note_id: int) -> Note | None:
        return self._set_deleted(user_id, note_id, utcnow())

    def restore(self, user_id: int, note_id: int) -> Note | None:
        return self._set_deleted(user_id, note_id, None)

    def delete(self, user_id: int, note_id: int) -> bool:
        with Session(self._engine) as session:
            row = self._row(session, user_id, note_id)
            if row is None:
                return False
            session.delete(row)
            session.commit()
            return True

    def empty_trash(self, user_id: int) -> int:
        with Session(self._engine) as session:
            rows = session.exec(
                select(NoteRow).where(NoteRow.user_id == user_id, NoteRow.deleted_at.is_not(None))  # type: ignore[union-attr]
            ).all()
            for row in rows:
                session.delete(row)
            session.commit()
            return len(rows)

    def reorder(self, user_id: int, ids: list[int]) -> list[Note] | None:
        with Session(self._engine) as session:
            rows = {
                row.id: row
                for row in session.exec(
                    select(NoteRow).where(NoteRow.id.in_(ids), NoteRow.user_id == user_id)  # type: ignore[attr-defined]
                ).all()
            }
            if len(rows) != len(set(ids)):
                return None
            for position, note_id in enumerate(ids):
                rows[note_id].position = position
                session.add(rows[note_id])
            session.commit()
            return self._all(session, user_id)

    # labels

    def _check_name(self, session: Session, user_id: int, name: str, except_id: int | None = None) -> None:
        clash = session.exec(
            select(LabelRow).where(LabelRow.user_id == user_id, func.lower(LabelRow.name) == name.lower())
        ).first()
        if clash and clash.id != except_id:
            raise DuplicateLabel(f"Label '{name}' already exists")

    def _label(self, session: Session, user_id: int, label_id: int) -> LabelRow | None:
        return session.exec(select(LabelRow).where(LabelRow.id == label_id, LabelRow.user_id == user_id)).first()

    def list_labels(self, user_id: int) -> list[Label]:
        with Session(self._engine) as session:
            rows = session.exec(
                select(LabelRow).where(LabelRow.user_id == user_id).order_by(func.lower(LabelRow.name))
            ).all()
            return [r.to_label() for r in rows]

    def create_label(self, user_id: int, data: LabelIn) -> Label:
        with Session(self._engine) as session:
            name = data.name.strip()
            self._check_name(session, user_id, name)
            row = LabelRow(user_id=user_id, name=name)
            session.add(row)
            session.commit()
            session.refresh(row)
            return row.to_label()

    def rename_label(self, user_id: int, label_id: int, data: LabelIn) -> Label | None:
        with Session(self._engine) as session:
            row = self._label(session, user_id, label_id)
            if row is None:
                return None
            name = data.name.strip()
            self._check_name(session, user_id, name, except_id=label_id)
            row.name = name
            session.add(row)
            session.commit()
            session.refresh(row)
            return row.to_label()

    def delete_label(self, user_id: int, label_id: int) -> bool:
        with Session(self._engine) as session:
            row = self._label(session, user_id, label_id)
            if row is None:
                return False
            session.delete(row)  # link rows go with it
            session.commit()
            return True

    def clear(self) -> None:
        with Session(self._engine) as session:
            for model in (NoteRow, LabelRow, UserRow):
                for row in session.exec(select(model)).all():
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
        # Serverless: the process stays warm between invocations, so keep one
        # connection open and reuse it. Opening a fresh TLS connection per request
        # cost ~2s when the function and the database were in different regions.
        return create_engine(
            url,
            connect_args=connect_args,
            poolclass=QueuePool,
            pool_size=1,
            max_overflow=2,
            pool_recycle=240,
            pool_pre_ping=True,
        )
    return create_engine(url, connect_args=connect_args, pool_pre_ping=True)


def create_store(database_url: str | None) -> NoteStore:
    """Pick a store from configuration: SQL when a URL is given, memory otherwise."""
    if database_url:
        return SqlNoteStore(make_engine(database_url))
    return InMemoryNoteStore()


_init_lock = Lock()


def ensure_store(app) -> NoteStore:
    """Return the app's store, creating it on first use.

    Lifespan normally does this at startup, but some serverless hosts (Vercel)
    skip lifespan events, so every code path that needs the store goes through
    here. The lock keeps two concurrent first requests from building two stores.
    """
    store = getattr(app.state, "store", None)
    if store is None:
        with _init_lock:
            store = getattr(app.state, "store", None)
            if store is None:
                store = app.state.store = create_store(os.getenv("DATABASE_URL"))
    return store
