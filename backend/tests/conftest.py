import pytest
from fastapi.testclient import TestClient

from main import app, get_store
from store import InMemoryNoteStore, SqlNoteStore, make_engine

ALICE = {"email": "alice@example.com", "password": "correct horse battery"}
BOB = {"email": "bob@example.com", "password": "another strong one"}


@pytest.fixture(autouse=True)
def isolate_from_environment(monkeypatch):
    """Never let tests touch a real database configured in .env."""
    monkeypatch.delenv("DATABASE_URL", raising=False)
    if hasattr(app.state, "store"):
        del app.state.store
    yield
    if hasattr(app.state, "store"):
        del app.state.store


@pytest.fixture(params=["memory", "sqlite"])
def store(request):
    store = InMemoryNoteStore() if request.param == "memory" else SqlNoteStore(make_engine("sqlite://"))
    app.dependency_overrides[get_store] = lambda: store
    # auth.current_user reads the store from app.state; keep them the same object.
    app.state.store = store
    yield store
    app.dependency_overrides.clear()
    store.clear()


@pytest.fixture
def anon(store):
    """A client with no session."""
    with TestClient(app) as client:
        app.state.store = store
        yield client


@pytest.fixture
def client(store):
    """A client signed in as Alice."""
    with TestClient(app) as client:
        app.state.store = store
        assert client.post("/auth/signup", json=ALICE).status_code == 201
        yield client


@pytest.fixture
def other(store):
    """A second, independent client signed in as Bob."""
    with TestClient(app) as client:
        app.state.store = store
        assert client.post("/auth/signup", json=BOB).status_code == 201
        yield client
