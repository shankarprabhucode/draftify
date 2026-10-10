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

    created = client.post("/notes", json={"title": "First", "content": "hello"})
    assert created.status_code == 201
    note = created.json()
    assert note == {"id": 1, "title": "First", "content": "hello"}

    updated = client.put(f"/notes/{note['id']}", json={"title": "Edited", "content": ""})
    assert updated.status_code == 200
    assert updated.json() == {"id": 1, "title": "Edited", "content": ""}

    assert client.get("/notes").json() == [updated.json()]
    assert client.get(f"/notes/{note['id']}").json() == updated.json()

    deleted = client.delete(f"/notes/{note['id']}")
    assert deleted.status_code == 204
    assert client.get("/notes").json() == []


def test_list_preserves_creation_order(client):
    for title in ("a", "b", "c"):
        client.post("/notes", json={"title": title})
    assert [n["title"] for n in client.get("/notes").json()] == ["a", "b", "c"]


def test_missing_note_returns_404(client):
    assert client.get("/notes/99").status_code == 404
    assert client.put("/notes/99", json={"title": "x", "content": ""}).status_code == 404
    assert client.delete("/notes/99").status_code == 404


def test_title_is_required(client):
    assert client.post("/notes", json={"title": "", "content": "x"}).status_code == 422
