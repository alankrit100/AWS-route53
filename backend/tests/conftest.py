import os
import bcrypt

os.environ["TESTING"] = "1"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import User
from app.seed import seed_database
from app.utils.auth import create_token


@pytest.fixture(scope="function")
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestSession()

    admin = User(
        id="U-TEST-ADMIN",
        username="admin",
        password_hash=bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode(),
    )
    session.add(admin)
    session.commit()

    yield session
    session.close()


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def auth_headers(client, db_session):
    user = db_session.query(User).filter(User.username == "admin").first()
    token = create_token(user)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def seeded_client(db_session):
    seed_database(db_session)
    db_session.commit()

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def seeded_auth_headers(seeded_client, db_session):
    user = db_session.query(User).filter(User.username == "admin").first()
    token = create_token(user)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def sample_zone_id(seeded_client, seeded_auth_headers):
    resp = seeded_client.get("/api/zones", headers=seeded_auth_headers)
    data = resp.json()
    if data["hosted_zones"]:
        return data["hosted_zones"][0]["id"]
    create_resp = seeded_client.post("/api/zones", json={
        "name": "fixture-zone.com",
        "caller_reference": "fixture-zone-ref",
    }, headers=seeded_auth_headers)
    return create_resp.json()["id"]
