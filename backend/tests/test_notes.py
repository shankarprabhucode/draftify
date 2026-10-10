import pytest
from fastapi.testclient import TestClient

from main import app, store


@pytest.fixture(autouse=True)
def reset_store():
    store.clear()
    yield
    store.clear()


@pytest.fixture
def client():
    return TestClient(app)


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

    deleted = client.delete(f"/notes/{note['id']}")
    assert deleted.status_code == 204
    assert client.get("/notes").json() == []


def test_missing_note_returns_404(client):
    assert client.get("/notes/99").status_code == 404
    assert client.put("/notes/99", json={"title": "x", "content": ""}).status_code == 404
    assert client.delete("/notes/99").status_code == 404


def test_title_is_required(client):
    assert client.post("/notes", json={"title": "", "content": "x"}).status_code == 422
