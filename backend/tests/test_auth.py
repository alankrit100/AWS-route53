import pytest


def test_login_success(client):
    r = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["username"] == "admin"


def test_login_invalid_username(client):
    r = client.post("/api/auth/login", json={"username": "nonexistent", "password": "admin123"})
    assert r.status_code == 401


def test_login_invalid_password(client):
    r = client.post("/api/auth/login", json={"username": "admin", "password": "wrongpass"})
    assert r.status_code == 401


def test_login_missing_username(client):
    r = client.post("/api/auth/login", json={"password": "admin123"})
    assert r.status_code == 422


def test_login_missing_password(client):
    r = client.post("/api/auth/login", json={"username": "admin"})
    assert r.status_code == 422


def test_me_valid_token(client, auth_headers):
    r = client.get("/api/auth/me", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["username"] == "admin"


def test_me_missing_token(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_me_invalid_token(client):
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer invalidtoken123"})
    assert r.status_code == 401


def test_me_malformed_header(client):
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer"})
    assert r.status_code == 401


def test_logout(client, auth_headers):
    r = client.post("/api/auth/logout", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["success"] is True


def test_protected_route_without_auth(client):
    r = client.get("/api/zones")
    assert r.status_code == 401


def test_cors_headers(client):
    r = client.options("/api/health", headers={
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
    })
    assert r.status_code == 200
    assert "access-control-allow-origin" in r.headers


def test_login_empty_strings(client):
    r = client.post("/api/auth/login", json={"username": "", "password": ""})
    assert r.status_code == 401


def test_signup_success(client):
    r = client.post("/api/auth/signup", json={"username": "newuser", "password": "newpass123"})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["username"] == "newuser"


def test_signup_duplicate_username(client):
    client.post("/api/auth/signup", json={"username": "dupuser", "password": "pass1234"})
    r = client.post("/api/auth/signup", json={"username": "dupuser", "password": "other123"})
    assert r.status_code == 409


def test_signup_short_password(client):
    r = client.post("/api/auth/signup", json={"username": "shortpw", "password": "12345"})
    assert r.status_code == 400


def test_signup_short_username(client):
    r = client.post("/api/auth/signup", json={"username": "ab", "password": "password123"})
    assert r.status_code == 400


def test_refresh_token(client):
    login_r = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    refresh_token = login_r.json()["refresh_token"]

    r = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_refresh_invalid_token(client):
    r = client.post("/api/auth/refresh", json={"refresh_token": "invalid-token"})
    assert r.status_code == 401
