"""Pydantic/SQLModel schemas shared by the API and the stores."""

from sqlmodel import Field, SQLModel


class NoteIn(SQLModel):
    """Payload accepted on create and update. The server owns the id."""

    title: str = Field(min_length=1, max_length=200)
    content: str = Field(default="", max_length=10_000)


class Note(NoteIn):
    """What the API returns."""

    id: int


class NoteRow(SQLModel, table=True):
    """Database table. Kept separate from the API schema so the two can drift."""

    __tablename__ = "notes"

    id: int | None = Field(default=None, primary_key=True)
    title: str
    content: str = ""

    def to_note(self) -> Note:
        assert self.id is not None
        return Note(id=self.id, title=self.title, content=self.content)
