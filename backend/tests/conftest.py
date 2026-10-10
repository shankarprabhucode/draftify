import pytest

from main import app


@pytest.fixture(autouse=True)
def isolate_from_environment(monkeypatch):
    """Never let tests touch a real database configured in .env."""
    monkeypatch.delenv("DATABASE_URL", raising=False)
    if hasattr(app.state, "store"):
        del app.state.store
    yield
    if hasattr(app.state, "store"):
        del app.state.store
