def test_create_change_on_zone_create(seeded_client, seeded_auth_headers):
    r = seeded_client.post("/api/zones", json={
        "name": "change-test.com",
        "caller_reference": "change-test-ref",
    }, headers=seeded_auth_headers)
    assert r.status_code == 201


def test_create_change_on_record_create(seeded_client, seeded_auth_headers, sample_zone_id):
    r = seeded_client.post(f"/api/zones/{sample_zone_id}/records", json={
        "change_batch": {
            "changes": [{
                "action": "CREATE",
                "resource_record_set": {
                    "name": "change-record.com",
                    "type": "A",
                    "ttl": 300,
                    "resource_records": [{"value": "10.0.0.1"}],
                },
            }],
        },
    }, headers=seeded_auth_headers)
    data = r.json()
    assert "change_info" in data
    assert data["change_info"]["status"] in ("PENDING", "INSYNC")


def test_get_change(seeded_client, seeded_auth_headers, sample_zone_id):
    r = seeded_client.post(f"/api/zones/{sample_zone_id}/records", json={
        "change_batch": {
            "changes": [{
                "action": "CREATE",
                "resource_record_set": {
                    "name": "get-change-test.com",
                    "type": "A",
                    "ttl": 300,
                    "resource_records": [{"value": "10.0.0.1"}],
                },
            }],
        },
    }, headers=seeded_auth_headers)
    change_id = r.json()["change_info"]["id"]
    r = seeded_client.get(f"/api/changes/{change_id}", headers=seeded_auth_headers)
    assert r.status_code == 200
    assert r.json()["change_info"]["status"] in ("PENDING", "INSYNC")


def test_get_change_not_found(seeded_client, seeded_auth_headers):
    r = seeded_client.get("/api/changes/CINVALID999", headers=seeded_auth_headers)
    assert r.status_code == 404


def test_change_includes_submitted_at(seeded_client, seeded_auth_headers, sample_zone_id):
    r = seeded_client.post(f"/api/zones/{sample_zone_id}/records", json={
        "change_batch": {
            "changes": [{
                "action": "CREATE",
                "resource_record_set": {
                    "name": "change-time.com",
                    "type": "A",
                    "ttl": 300,
                    "resource_records": [{"value": "10.0.0.1"}],
                },
            }],
        },
    }, headers=seeded_auth_headers)
    data = r.json()["change_info"]
    assert data["submitted_at"] is not None
