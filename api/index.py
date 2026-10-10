"""Vercel entry point for the Draftify API.

Vercel turns every file under ``api/`` into a serverless function. ``vercel.json``
rewrites ``/api/*`` here, and the FastAPI app is mounted under ``/api`` so the
request paths line up with what the frontend calls.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from fastapi import FastAPI  # noqa: E402

from main import app as notes_app  # noqa: E402

app = FastAPI(openapi_url=None, docs_url=None, redoc_url=None)
app.mount("/api", notes_app)
