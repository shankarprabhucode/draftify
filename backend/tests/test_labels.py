"""Label CRUD and note/label links, against both stores."""

import pytest
from fastapi.testclient import TestClient

from main import app, get_store
from store import InMemoryNoteStore, SqlNoteStore, make_engine


@pytest.fixture(params=["memory", "sqlite"])
def client(request):
    store = InMemoryNoteStore() if request.param == "memory" else SqlNoteStore(make_engine("sqlite://"))
    app.dependency_overrides[get_store] = lambda: store
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
    store.clear()


def test_label_crud(client):
    assert client.get("/labels").json() == []
    work = client.post("/labels", json={"name": "Work"})
    assert work.status_code == 201
    assert work.json() == {"id": 1, "name": "Work"}
    client.post("/labels", json={"name": "ideas"})
    assert [l["name"] for l in client.get("/labels").json()] == ["ideas", "Work"]  # case-insensitive sort

    assert client.post("/labels", json={"name": "work"}).status_code == 409
    assert client.post("/labels", json={"name": ""}).status_code == 422

    renamed = client.put("/labels/1", json={"name": "Office"})
    assert renamed.json() == {"id": 1, "name": "Office"}
    assert client.put("/labels/1", json={"name": "IDEAS"}).status_code == 409
    assert client.put("/labels/99", json={"name": "x"}).status_code == 404

    assert client.delete("/labels/1").status_code == 204
    assert client.delete("/labels/1").status_code == 404
    assert [l["name"] for l in client.get("/labels").json()] == ["ideas"]


def test_notes_carry_labels(client):
    work = client.post("/labels", json={"name": "Work"}).json()
    home = client.post("/labels", json={"name": "Home"}).json()

    note = client.post("/notes", json={"title": "n", "label_ids": [work["id"], home["id"]]}).json()
    assert [l["name"] for l in note["labels"]] == ["Home", "Work"]
    assert [l["name"] for l in client.get("/notes").json()[0]["labels"]] == ["Home", "Work"]

    # Update replaces the set.
    updated = client.put(f"/notes/{note['id']}", json={"title": "n", "label_ids": [work["id"]]}).json()
    assert [l["name"] for l in updated["labels"]] == ["Work"]

    # Renaming a label shows up on the note.
    client.put(f"/labels/{work['id']}", json={"name": "Office"})
    assert [l["name"] for l in client.get(f"/notes/{note['id']}").json()["labels"]] == ["Office"]

    # Deleting a label detaches it from notes.
    client.delete(f"/labels/{work['id']}")
    assert client.get(f"/notes/{note['id']}").json()["labels"] == []

    # Unknown label ids are rejected.
    assert client.post("/notes", json={"title": "x", "label_ids": [999]}).status_code == 422
