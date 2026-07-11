import pytest


def test_create_zone_basic(seeded_client, seeded_auth_headers):
    r = seeded_client.post("/api/zones", json={
        "name": "testdomain.com",
        "caller_reference": "test-ref-001",
    }, headers=seeded_auth_headers)
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "testdomain.com."
    assert data["id"].startswith("Z")
    assert data["delegation_set"] is not None
    assert len(data["delegation_set"]["name_servers"]) == 4


def test_create_zone_with_comment(seeded_client, seeded_auth_headers):
    r = seeded_client.post("/api/zones", json={
        "name": "comment-test.com",
        "caller_reference": "test-ref-002",
        "hosted_zone_config": {"comment": "My comment"},
    }, headers=seeded_auth_headers)
    assert r.status_code == 201
    assert r.json()["config"]["comment"] == "My comment"


def test_create_zone_private(seeded_client, seeded_auth_headers):
    r = seeded_client.post("/api/zones", json={
        "name": "private-test.com",
        "caller_reference": "test-ref-003",
        "hosted_zone_config": {"private_zone": True, "comment": "private"},
    }, headers=seeded_auth_headers)
    assert r.status_code == 201
    assert r.json()["config"]["private_zone"] is True


def test_create_zone_auto_creates_soa_ns(seeded_client, seeded_auth_headers):
    r = seeded_client.post("/api/zones", json={
        "name": "autorecords-test.com",
        "caller_reference": "test-ref-004",
    }, headers=seeded_auth_headers)
    assert r.status_code == 201
    zone_id = r.json()["id"]
    rr = seeded_client.get(f"/api/zones/{zone_id}/records", headers=seeded_auth_headers)
    records = rr.json()["records"]
    types = {rec["type"] for rec in records}
    assert "SOA" in types
    assert "NS" in types


def test_create_zone_duplicate_caller_ref(seeded_client, seeded_auth_headers):
    seeded_client.post("/api/zones", json={
        "name": "dup-caller.com",
        "caller_reference": "dup-ref",
    }, headers=seeded_auth_headers)
    r = seeded_client.post("/api/zones", json={
        "name": "dup-caller-2.com",
        "caller_reference": "dup-ref",
    }, headers=seeded_auth_headers)
    assert r.status_code == 409


def test_create_zone_duplicate_name(seeded_client, seeded_auth_headers):
    seeded_client.post("/api/zones", json={
        "name": "dup-name.com",
        "caller_reference": "ref-a",
    }, headers=seeded_auth_headers)
    r = seeded_client.post("/api/zones", json={
        "name": "dup-name.com",
        "caller_reference": "ref-b",
    }, headers=seeded_auth_headers)
    assert r.status_code == 400


def test_create_zone_missing_name(seeded_client, seeded_auth_headers):
    r = seeded_client.post("/api/zones", json={
        "caller_reference": "test-ref-005",
    }, headers=seeded_auth_headers)
    assert r.status_code == 422


def test_list_zones(seeded_client, seeded_auth_headers):
    r = seeded_client.get("/api/zones", headers=seeded_auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert len(data["hosted_zones"]) >= 3
    assert data["total"] >= 3


def test_list_zones_search(seeded_client, seeded_auth_headers):
    r = seeded_client.get("/api/zones?search=example", headers=seeded_auth_headers)
    assert r.status_code == 200
    for z in r.json()["hosted_zones"]:
        assert "example" in z["name"].lower()


def test_list_zones_pagination(seeded_client, seeded_auth_headers):
    r = seeded_client.get("/api/zones?page=1&size=2", headers=seeded_auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert len(data["hosted_zones"]) <= 2


def test_get_zone_by_id(seeded_client, seeded_auth_headers, sample_zone_id):
    r = seeded_client.get(f"/api/zones/{sample_zone_id}", headers=seeded_auth_headers)
    assert r.status_code == 200
    assert r.json()["id"] == sample_zone_id


def test_get_zone_not_found(seeded_client, seeded_auth_headers):
    r = seeded_client.get("/api/zones/ZZZINVALID999", headers=seeded_auth_headers)
    assert r.status_code == 404


def test_get_zone_includes_delegation_set(seeded_client, seeded_auth_headers, sample_zone_id):
    r = seeded_client.get(f"/api/zones/{sample_zone_id}", headers=seeded_auth_headers)
    assert r.json()["delegation_set"] is not None


def test_get_zone_includes_record_count(seeded_client, seeded_auth_headers, sample_zone_id):
    r = seeded_client.get(f"/api/zones/{sample_zone_id}", headers=seeded_auth_headers)
    assert r.json()["resource_record_set_count"] > 0


def test_update_zone_comment(seeded_client, seeded_auth_headers, sample_zone_id):
    r = seeded_client.put(f"/api/zones/{sample_zone_id}", json={
        "comment": "Updated comment",
    }, headers=seeded_auth_headers)
    assert r.status_code == 200
    assert r.json()["config"]["comment"] == "Updated comment"


def test_update_zone_comment_empty(seeded_client, seeded_auth_headers, sample_zone_id):
    r = seeded_client.put(f"/api/zones/{sample_zone_id}", json={
        "comment": "",
    }, headers=seeded_auth_headers)
    assert r.status_code == 200
    assert r.json()["config"]["comment"] == ""


def test_update_zone_not_found(seeded_client, seeded_auth_headers):
    r = seeded_client.put("/api/zones/ZZZINVALID999", json={"comment": "test"}, headers=seeded_auth_headers)
    assert r.status_code == 404


def test_delete_zone_not_found(seeded_client, seeded_auth_headers):
    r = seeded_client.delete("/api/zones/ZZZINVALID999", headers=seeded_auth_headers)
    assert r.status_code == 404


def test_create_zone_normalizes_trailing_dot(seeded_client, seeded_auth_headers):
    r1 = seeded_client.post("/api/zones", json={
        "name": "notrailing.com",
        "caller_reference": "trailing-a",
    }, headers=seeded_auth_headers)
    r2 = seeded_client.post("/api/zones", json={
        "name": "notrailing2.com.",
        "caller_reference": "trailing-b",
    }, headers=seeded_auth_headers)
    assert r1.json()["name"] == "notrailing.com."
    assert r2.json()["name"] == "notrailing2.com."
