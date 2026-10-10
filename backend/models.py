"""Pydantic/SQLModel schemas shared by the API and the stores."""

from datetime import datetime, timedelta, timezone
from typing import Literal

from pydantic import EmailStr
from sqlmodel import Field, Relationship, SQLModel

NoteColor = Literal[
    "default", "red", "orange", "yellow", "green", "teal", "blue", "purple", "pink", "gray"
]

# Content is stored as sanitised HTML produced by the rich-text editor.
MAX_CONTENT_LENGTH = 200_000
MAX_LABEL_LENGTH = 50
MIN_PASSWORD_LENGTH = 8
# Notes in the trash are purged after this long.
TRASH_RETENTION = timedelta(days=7)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime) -> datetime:
    """SQLite drops the timezone; treat naive values as UTC."""
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


# ---------------------------------------------------------------- API schemas


class Credentials(SQLModel):
    email: EmailStr = Field(description="Case-insensitive; stored lower-cased.")
    password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=128, description="At least 8 characters.")

    model_config = {"json_schema_extra": {"example": {"email": "demo@test.com", "password": "demo1234"}}}


class User(SQLModel):
    id: int
    email: str
    created_at: datetime


class LabelIn(SQLModel):
    name: str = Field(min_length=1, max_length=MAX_LABEL_LENGTH, description="Unique per user, case-insensitive.")

    model_config = {"json_schema_extra": {"example": {"name": "Work"}}}


class Label(LabelIn):
    id: int


class NoteIn(SQLModel):
    """Payload accepted on create and update. The server owns id, order and timestamps."""

    title: str = Field(default="", max_length=200)
    content: str = Field(default="", max_length=MAX_CONTENT_LENGTH, description="HTML produced by the editor.")
    color: NoteColor = Field(default="default", description="One of Keep's card colours.")
    pinned: bool = Field(default=False, description="Pinned notes sort first. Ignored while archived.")
    archived: bool = False
    label_ids: list[int] = Field(default_factory=list, description="Ids of the user's labels to attach.")

    model_config = {
        "json_schema_extra": {
            "example": {
                "title": "Weekly groceries",
                "content": "<ul data-type=\"taskList\"><li data-type=\"taskItem\" data-checked=\"false\"><label><input type=\"checkbox\"><span></span></label><div><p>Milk</p></div></li></ul>",
                "color": "red",
                "pinned": True,
                "archived": False,
                "label_ids": [1],
            }
        }
    }


class Note(SQLModel):
    """What the API returns."""

    id: int
    title: str
    content: str
    color: NoteColor
    pinned: bool
    archived: bool
    position: int
    updated_at: datetime
    deleted_at: datetime | None = None
    labels: list[Label] = Field(default_factory=list)

    @property
    def trashed(self) -> bool:
        return self.deleted_at is not None


class ReorderIn(SQLModel):
    """Full display order of notes, first item shown first."""

    ids: list[int] = Field(description="Note ids in the order they should appear.")

    model_config = {"json_schema_extra": {"example": {"ids": [12, 7, 3]}}}


# ---------------------------------------------------------------- tables


class UserRow(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(max_length=254, unique=True, index=True)
    password_hash: str
    created_at: datetime = Field(default_factory=utcnow)

    def to_user(self) -> User:
        assert self.id is not None
        return User(id=self.id, email=self.email, created_at=_aware(self.created_at))


class NoteLabelLink(SQLModel, table=True):
    __tablename__ = "note_labels"

    note_id: int = Field(foreign_key="notes.id", primary_key=True)
    label_id: int = Field(foreign_key="labels.id", primary_key=True)


class LabelRow(SQLModel, table=True):
    __tablename__ = "labels"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int | None = Field(default=None, foreign_key="users.id", index=True)
    name: str = Field(max_length=MAX_LABEL_LENGTH)
    notes: list["NoteRow"] = Relationship(back_populates="labels", link_model=NoteLabelLink)

    def to_label(self) -> Label:
        assert self.id is not None
        return Label(id=self.id, name=self.name)


class NoteRow(SQLModel, table=True):
    """Database table. Kept separate from the API schema so the two can drift."""

    __tablename__ = "notes"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int | None = Field(default=None, foreign_key="users.id", index=True)
    title: str = ""
    content: str = ""
    color: str = "default"
    pinned: bool = False
    archived: bool = False
    position: int = Field(default=0, index=True)
    updated_at: datetime = Field(default_factory=utcnow)
    deleted_at: datetime | None = Field(default=None, index=True)
    labels: list[LabelRow] = Relationship(back_populates="notes", link_model=NoteLabelLink)

    def to_note(self) -> Note:
        assert self.id is not None
        return Note(
            id=self.id,
            title=self.title,
            content=self.content,
            color=self.color,  # type: ignore[arg-type]
            pinned=self.pinned,
            archived=self.archived,
            position=self.position,
            updated_at=_aware(self.updated_at),
            deleted_at=_aware(self.deleted_at) if self.deleted_at else None,
            labels=sorted((l.to_label() for l in self.labels), key=lambda l: l.name.lower()),
        )
