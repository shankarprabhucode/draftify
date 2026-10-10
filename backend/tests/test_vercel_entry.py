"""The Vercel entry point must serve the same API under the /api prefix."""

import importlib.util
import sys
from pathlib import Path

from fastapi.testclient import TestClient


def _load_vercel_app():
    path = Path(__file__).resolve().parents[2] / "api" / "index.py"
    spec = importlib.util.spec_from_file_location("vercel_index", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules["vercel_index"] = module
    spec.loader.exec_module(module)
    return module.app


def test_api_prefix_routes_to_notes():
    app = _load_vercel_app()
    with TestClient(app) as client:
        assert client.get("/api/notes").status_code == 401
        assert client.post("/api/auth/signup", json={"email": "v@example.com", "password": "long enough pw"}).status_code == 201
        assert client.get("/api/notes").status_code == 200
        created = client.post("/api/notes", json={"title": "via vercel"})
        assert created.status_code == 201
        assert client.get("/api/notes").json() == [created.json()]
        assert client.get("/notes").status_code == 404
