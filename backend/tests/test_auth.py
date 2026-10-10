"""Sign-up, login, sessions and per-user isolation."""

from fastapi.testclient import TestClient

from auth import COOKIE_NAME, login_limiter
from main import app
from tests.conftest import ALICE, BOB


def test_signup_sets_session_and_me_works(anon):
    r = anon.post("/auth/signup", json=ALICE)
    assert r.status_code == 201
    assert r.json()["email"] == ALICE["email"]
    assert "password" not in r.json() and "password_hash" not in r.json()
    cookie = r.headers["set-cookie"]
    assert COOKIE_NAME in cookie and "HttpOnly" in cookie and "SameSite=lax" in cookie.lower().replace("samesite=lax", "SameSite=lax")
    assert anon.get("/auth/me").json()["email"] == ALICE["email"]


def test_unauthenticated_requests_are_rejected(anon):
    assert anon.get("/auth/me").status_code == 401
    assert anon.get("/notes").status_code == 401
    assert anon.post("/notes", json={"title": "x"}).status_code == 401
    assert anon.get("/labels").status_code == 401


def test_signup_validation_and_duplicates(anon):
    assert anon.post("/auth/signup", json={"email": "not-an-email", "password": "long enough pw"}).status_code == 422
    assert anon.post("/auth/signup", json={"email": "a@example.com", "password": "short"}).status_code == 422
    assert anon.post("/auth/signup", json=ALICE).status_code == 201
    dup = anon.post("/auth/signup", json={**ALICE, "email": ALICE["email"].upper()})
    assert dup.status_code == 409


def test_login_logout(anon):
    anon.post("/auth/signup", json=ALICE)
    anon.post("/auth/logout")
    assert anon.get("/auth/me").status_code == 401

    wrong = anon.post("/auth/login", json={**ALICE, "password": "wrong password!"})
    assert wrong.status_code == 401
    assert wrong.json()["detail"] == "Incorrect email or password"
    unknown = anon.post("/auth/login", json={"email": "nobody@example.com", "password": "whatever123"})
    assert unknown.status_code == 401
    assert unknown.json()["detail"] == wrong.json()["detail"]  # no account enumeration

    ok = anon.post("/auth/login", json={**ALICE, "email": ALICE["email"].upper()})
    assert ok.status_code == 200
    assert anon.get("/auth/me").json()["email"] == ALICE["email"]


def test_tampered_cookie_is_rejected(anon):
    anon.post("/auth/signup", json=ALICE)
    anon.cookies.set(COOKIE_NAME, "not.a.jwt")
    assert anon.get("/auth/me").status_code == 401


def test_login_rate_limit(anon):
    anon.post("/auth/signup", json=ALICE)
    login_limiter.reset(f"testclient:{ALICE['email']}")
    for _ in range(10):
        assert anon.post("/auth/login", json={**ALICE, "password": "wrong password!"}).status_code == 401
    assert anon.post("/auth/login", json=ALICE).status_code == 429
    login_limiter.reset(f"testclient:{ALICE['email']}")


def test_users_cannot_see_each_other(client, other):
    mine = client.post("/notes", json={"title": "alice"}).json()
    theirs = other.post("/notes", json={"title": "bob"}).json()
    label = client.post("/labels", json={"name": "Private"}).json()

    assert [n["title"] for n in client.get("/notes").json()] == ["alice"]
    assert [n["title"] for n in other.get("/notes").json()] == ["bob"]
    assert other.get(f"/notes/{mine['id']}").status_code == 404
    assert other.put(f"/notes/{mine['id']}", json={"title": "hijack"}).status_code == 404
    assert other.delete(f"/notes/{mine['id']}").status_code == 404
    assert other.post("/notes/reorder", json={"ids": [mine["id"]]}).status_code == 404
    assert other.get("/labels").json() == []
    assert other.delete(f"/labels/{label['id']}").status_code == 404
    # Bob cannot attach Alice's label to his note.
    assert other.put(f"/notes/{theirs['id']}", json={"title": "bob", "label_ids": [label["id"]]}).status_code == 422
    # Label names are unique per user, not globally.
    assert other.post("/labels", json={"name": "private"}).status_code == 201


def test_first_account_adopts_orphaned_notes(store):
    """Rows created before accounts existed (user_id NULL) go to the first user."""
    from models import Label, Note, utcnow

    if hasattr(store, "_engine"):
        from sqlmodel import Session

        from models import LabelRow, NoteRow

        with Session(store._engine) as s:
            s.add(NoteRow(title="orphan"))
            s.add(LabelRow(name="Old"))
            s.commit()
    else:
        from store import _MemNote

        with store._lock:
            orphan = Note(id=99, title="orphan", content="", color="default", pinned=False,
                          archived=False, position=0, updated_at=utcnow())
            store._notes[99] = _MemNote(orphan, None)
            store._labels[98] = (Label(id=98, name="Old"), None)

    with TestClient(app) as first:
        app.state.store = store
        first.post("/auth/signup", json=ALICE)
        assert [n["title"] for n in first.get("/notes").json()] == ["orphan"]
        assert [l["name"] for l in first.get("/labels").json()] == ["Old"]
    with TestClient(app) as second:
        app.state.store = store
        second.post("/auth/signup", json=BOB)
        assert second.get("/notes").json() == []
