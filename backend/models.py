"""Pydantic/SQLModel schemas shared by the API and the stores."""

from datetime import datetime, timezone
from typing import Literal

from sqlmodel import Field, Relationship, SQLModel

NoteColor = Literal[
    "default", "red", "orange", "yellow", "green", "teal", "blue", "purple", "pink", "gray"
]

# Content is stored as sanitised HTML produced by the rich-text editor.
MAX_CONTENT_LENGTH = 200_000
MAX_LABEL_LENGTH = 50


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------- API schemas


class LabelIn(SQLModel):
    name: str = Field(min_length=1, max_length=MAX_LABEL_LENGTH)


class Label(LabelIn):
    id: int


class NoteIn(SQLModel):
    """Payload accepted on create and update. The server owns id, order and timestamps."""

    title: str = Field(default="", max_length=200)
    content: str = Field(default="", max_length=MAX_CONTENT_LENGTH)
    color: NoteColor = "default"
    pinned: bool = False
    label_ids: list[int] = Field(default_factory=list)


class Note(SQLModel):
    """What the API returns."""

    id: int
    title: str
    content: str
    color: NoteColor
    pinned: bool
    position: int
    updated_at: datetime
    labels: list[Label] = Field(default_factory=list)


class ReorderIn(SQLModel):
    """Full display order of notes, first item shown first."""

    ids: list[int]


# ---------------------------------------------------------------- tables


class NoteLabelLink(SQLModel, table=True):
    __tablename__ = "note_labels"

    note_id: int = Field(foreign_key="notes.id", primary_key=True)
    label_id: int = Field(foreign_key="labels.id", primary_key=True)


class LabelRow(SQLModel, table=True):
    __tablename__ = "labels"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=MAX_LABEL_LENGTH, unique=True)
    notes: list["NoteRow"] = Relationship(back_populates="labels", link_model=NoteLabelLink)

    def to_label(self) -> Label:
        assert self.id is not None
        return Label(id=self.id, name=self.name)


class NoteRow(SQLModel, table=True):
    """Database table. Kept separate from the API schema so the two can drift."""

    __tablename__ = "notes"

    id: int | None = Field(default=None, primary_key=True)
    title: str = ""
    content: str = ""
    color: str = "default"
    pinned: bool = False
    position: int = Field(default=0, index=True)
    updated_at: datetime = Field(default_factory=utcnow)
    labels: list[LabelRow] = Relationship(back_populates="notes", link_model=NoteLabelLink)

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
            position=self.position,
            updated_at=updated,
            labels=sorted((l.to_label() for l in self.labels), key=lambda l: l.name.lower()),
        )
