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
    assert note["archived"] is False
    assert note["deleted_at"] is None
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

    assert client.delete(f"/notes/{note['id']}", params={"permanent": "true"}).status_code == 204
    assert client.get("/notes").json() == []


def test_defaults_allow_untitled_notes(client):
    created = client.post("/notes", json={"content": "<p>just text</p>"})
    assert created.status_code == 201
    assert created.json()["title"] == ""


def titles(client):
    return [n["title"] for n in client.get("/notes").json()]


def test_new_notes_appear_first(client):
    for title in ("a", "b", "c"):
        client.post("/notes", json={"title": title})
    assert titles(client) == ["c", "b", "a"]


def test_pinned_notes_come_first_and_pinning_moves_to_top_of_group(client):
    ids = {t: client.post("/notes", json={"title": t}).json()["id"] for t in ("a", "b", "c")}
    assert titles(client) == ["c", "b", "a"]
    client.put(f"/notes/{ids['a']}", json={"title": "a", "pinned": True})
    assert titles(client) == ["a", "c", "b"]
    client.put(f"/notes/{ids['b']}", json={"title": "b", "pinned": True})
    assert titles(client) == ["b", "a", "c"]
    # Unpinning drops the note to the top of the unpinned group.
    client.put(f"/notes/{ids['a']}", json={"title": "a", "pinned": False})
    assert titles(client) == ["b", "a", "c"]
    # Editing content does not move a note.
    client.put(f"/notes/{ids['c']}", json={"title": "c!", "pinned": False})
    assert titles(client) == ["b", "a", "c!"]


def test_reorder(client):
    ids = {t: client.post("/notes", json={"title": t}).json()["id"] for t in ("a", "b", "c")}
    res = client.post("/notes/reorder", json={"ids": [ids["a"], ids["c"], ids["b"]]})
    assert res.status_code == 200
    assert [n["title"] for n in res.json()] == ["a", "c", "b"]
    assert titles(client) == ["a", "c", "b"]
    # A note created afterwards still lands first.
    client.post("/notes", json={"title": "d"})
    assert titles(client) == ["d", "a", "c", "b"]
    assert client.post("/notes/reorder", json={"ids": [999]}).status_code == 404


def test_missing_note_returns_404(client):
    assert client.get("/notes/99").status_code == 404
    assert client.put("/notes/99", json={"title": "x"}).status_code == 404
    assert client.delete("/notes/99").status_code == 404
    assert client.delete("/notes/99", params={"permanent": "true"}).status_code == 404
    assert client.post("/notes/99/restore").status_code == 404


def test_trash_restore_and_empty(client):
    a = client.post("/notes", json={"title": "a", "pinned": True}).json()
    b = client.post("/notes", json={"title": "b"}).json()

    # Soft delete keeps the note, stamps deleted_at and unpins it.
    assert client.delete(f"/notes/{a['id']}").status_code == 204
    trashed = client.get(f"/notes/{a['id']}").json()
    assert trashed["deleted_at"] is not None
    assert trashed["pinned"] is False
    assert {n["id"] for n in client.get("/notes").json()} == {a["id"], b["id"]}

    restored = client.post(f"/notes/{a['id']}/restore").json()
    assert restored["deleted_at"] is None

    client.delete(f"/notes/{a['id']}")
    client.delete(f"/notes/{b['id']}")
    assert client.delete("/notes/trash").status_code == 204
    assert client.get("/notes").json() == []


def test_archiving_unpins(client):
    n = client.post("/notes", json={"title": "a", "pinned": True}).json()
    archived = client.put(f"/notes/{n['id']}", json={"title": "a", "pinned": True, "archived": True}).json()
    assert archived["archived"] is True
    assert archived["pinned"] is False
    back = client.put(f"/notes/{n['id']}", json={"title": "a", "archived": False}).json()
    assert back["archived"] is False


def test_old_trash_is_purged_on_list():
    from datetime import timedelta

    from models import utcnow

    store = InMemoryNoteStore()
    app.dependency_overrides[get_store] = lambda: store
    try:
        with TestClient(app) as client:
            old = client.post("/notes", json={"title": "old"}).json()
            fresh = client.post("/notes", json={"title": "fresh"}).json()
            client.delete(f"/notes/{old['id']}")
            client.delete(f"/notes/{fresh['id']}")
            # Backdate one deletion past the retention window.
            with store._lock:
                store._notes[old["id"]] = store._notes[old["id"]].model_copy(
                    update={"deleted_at": utcnow() - timedelta(days=8)}
                )
            assert [n["title"] for n in client.get("/notes").json()] == ["fresh"]
    finally:
        app.dependency_overrides.clear()


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

    assert migrate(engine) == ["color", "pinned", "updated_at", "position", "archived", "deleted_at"]
    assert migrate(engine) == []  # idempotent

    store = SqlNoteStore(engine)
    [note] = store.list()
    assert (note.title, note.color, note.pinned, note.position) == ("old", "default", False, -1)
    assert note.updated_at is not None
