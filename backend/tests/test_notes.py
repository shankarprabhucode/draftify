"""API tests, run once against each store implementation."""

import pytest
from fastapi.testclient import TestClient

from main import app, get_store
from store import InMemoryNoteStore, SqlNoteStore, make_engine


@pytest.fixture(params=["memory", "sqlite"])
def client(request):
    if request.param == "memory":
        store = InMemoryNoteStore()
    else:
        store = SqlNoteStore(make_engine("sqlite://"))

    app.dependency_overrides[get_store] = lambda: store
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
    store.clear()


def test_crud_round_trip(client):
    assert client.get("/notes").json() == []

    created = client.post("/notes", json={"title": "First", "content": "<p>hello</p>"})
    assert created.status_code == 201
    note = created.json()
    assert note["id"] == 1
    assert note["title"] == "First"
    assert note["content"] == "<p>hello</p>"
    assert note["color"] == "default"
    assert note["pinned"] is False
    assert note["updated_at"].endswith("Z") or "+00:00" in note["updated_at"]

    updated = client.put(
        f"/notes/{note['id']}",
        json={"title": "Edited", "content": "", "color": "teal", "pinned": True},
    )
    assert updated.status_code == 200
    body = updated.json()
    assert (body["title"], body["color"], body["pinned"]) == ("Edited", "teal", True)
    assert body["updated_at"] >= note["updated_at"]

    assert client.get("/notes").json() == [body]
    assert client.get(f"/notes/{note['id']}").json() == body

    assert client.delete(f"/notes/{note['id']}").status_code == 204
    assert client.get("/notes").json() == []


def test_defaults_allow_untitled_notes(client):
    created = client.post("/notes", json={"content": "<p>just text</p>"})
    assert created.status_code == 201
    assert created.json()["title"] == ""


def test_list_preserves_creation_order(client):
    for title in ("a", "b", "c"):
        client.post("/notes", json={"title": title})
    assert [n["title"] for n in client.get("/notes").json()] == ["a", "b", "c"]


def test_missing_note_returns_404(client):
    assert client.get("/notes/99").status_code == 404
    assert client.put("/notes/99", json={"title": "x"}).status_code == 404
    assert client.delete("/notes/99").status_code == 404


def test_validation(client):
    assert client.post("/notes", json={"title": "x" * 201}).status_code == 422
    assert client.post("/notes", json={"title": "x", "color": "neon"}).status_code == 422


def test_migration_adds_columns_to_old_table():
    """A table from the first release (id/title/content only) gains the new columns."""
    from sqlalchemy import text

    from store import migrate

    engine = make_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE notes (id INTEGER PRIMARY KEY, title VARCHAR, content VARCHAR)"))
        conn.execute(text("INSERT INTO notes (title, content) VALUES ('old', 'row')"))

    assert migrate(engine) == ["color", "pinned", "updated_at"]
    assert migrate(engine) == []  # idempotent

    store = SqlNoteStore(engine)
    [note] = store.list()
    assert (note.title, note.color, note.pinned) == ("old", "default", False)
    assert note.updated_at is not None
