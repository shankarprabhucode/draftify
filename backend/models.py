"""Pydantic/SQLModel schemas shared by the API and the stores."""

from datetime import datetime, timezone
from typing import Literal

from sqlmodel import Field, SQLModel

NoteColor = Literal[
    "default", "red", "orange", "yellow", "green", "teal", "blue", "purple", "pink", "gray"
]

# Content is stored as sanitised HTML produced by the rich-text editor.
MAX_CONTENT_LENGTH = 200_000


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class NoteIn(SQLModel):
    """Payload accepted on create and update. The server owns id and timestamps."""

    title: str = Field(default="", max_length=200)
    content: str = Field(default="", max_length=MAX_CONTENT_LENGTH)
    color: NoteColor = "default"
    pinned: bool = False


class Note(NoteIn):
    """What the API returns."""

    id: int
    updated_at: datetime


class NoteRow(SQLModel, table=True):
    """Database table. Kept separate from the API schema so the two can drift."""

    __tablename__ = "notes"

    id: int | None = Field(default=None, primary_key=True)
    title: str = ""
    content: str = ""
    color: str = "default"
    pinned: bool = False
    updated_at: datetime = Field(default_factory=utcnow)

    def to_note(self) -> Note:
        assert self.id is not None
        updated = self.updated_at
        if updated.tzinfo is None:  # SQLite drops the timezone
            updated = updated.replace(tzinfo=timezone.utc)
        return Note(
            id=self.id,
            title=self.title,
            content=self.content,
            color=self.color,  # type: ignore[arg-type]
            pinned=self.pinned,
            updated_at=updated,
        )
