def test_list_tags_empty(seeded_client, seeded_auth_headers):
    r = seeded_client.post("/api/zones", json={
        "name": "no-tags.com",
        "caller_reference": "no-tags-ref",
    }, headers=seeded_auth_headers)
    zone_id = r.json()["id"]
    r = seeded_client.get(f"/api/zones/{zone_id}/tags", headers=seeded_auth_headers)
    assert r.status_code == 200
    assert r.json()["tags"] == []


def test_add_tags(seeded_client, seeded_auth_headers, sample_zone_id):
    r = seeded_client.post(f"/api/zones/{sample_zone_id}/tags", json={
        "add_tags": [
            {"key": "Environment", "value": "Test"},
            {"key": "Owner", "value": "DevTeam"},
        ],
    }, headers=seeded_auth_headers)
    assert r.status_code == 200
    assert len(r.json()["tags"]) >= 2


def test_remove_tags(seeded_client, seeded_auth_headers, sample_zone_id):
    seeded_client.post(f"/api/zones/{sample_zone_id}/tags", json={
        "add_tags": [{"key": "TempTag", "value": "to-remove"}],
    }, headers=seeded_auth_headers)
    r = seeded_client.post(f"/api/zones/{sample_zone_id}/tags", json={
        "remove_tag_keys": ["TempTag"],
    }, headers=seeded_auth_headers)
    assert r.status_code == 200
    keys = [t["key"] for t in r.json()["tags"]]
    assert "TempTag" not in keys


def test_add_remove_same_request(seeded_client, seeded_auth_headers, sample_zone_id):
    seeded_client.post(f"/api/zones/{sample_zone_id}/tags", json={
        "add_tags": [{"key": "OldKey", "value": "old-value"}],
    }, headers=seeded_auth_headers)
    r = seeded_client.post(f"/api/zones/{sample_zone_id}/tags", json={
        "add_tags": [{"key": "NewKey", "value": "new-value"}],
        "remove_tag_keys": ["OldKey"],
    }, headers=seeded_auth_headers)
    assert r.status_code == 200
    keys = [t["key"] for t in r.json()["tags"]]
    assert "NewKey" in keys
    assert "OldKey" not in keys


def test_remove_nonexistent_tag(seeded_client, seeded_auth_headers, sample_zone_id):
    r = seeded_client.post(f"/api/zones/{sample_zone_id}/tags", json={
        "remove_tag_keys": ["NonExistentKey"],
    }, headers=seeded_auth_headers)
    assert r.status_code == 200


def test_max_10_tags(seeded_client, seeded_auth_headers, sample_zone_id):
    tags_list = [{"key": f"key{i}", "value": f"val{i}"} for i in range(11)]
    r = seeded_client.post(f"/api/zones/{sample_zone_id}/tags", json={
        "add_tags": tags_list,
    }, headers=seeded_auth_headers)
    assert r.status_code == 400


def test_list_tags_invalid_zone(seeded_client, seeded_auth_headers):
    r = seeded_client.get("/api/zones/INVALIDZONE/tags", headers=seeded_auth_headers)
    assert r.status_code == 404


def test_batch_tags(seeded_client, seeded_auth_headers, sample_zone_id):
    r = seeded_client.post("/api/tags?resource_type=hostedzone", json={
        "resource_ids": [sample_zone_id],
    }, headers=seeded_auth_headers)
    assert r.status_code == 200
    assert len(r.json()["resource_tag_sets"]) == 1


def test_batch_tags_too_many_ids(seeded_client, seeded_auth_headers):
    r = seeded_client.post("/api/tags?resource_type=hostedzone", json={
        "resource_ids": [str(i) for i in range(11)],
    }, headers=seeded_auth_headers)
    assert r.status_code == 400


def test_tag_key_too_long(seeded_client, seeded_auth_headers, sample_zone_id):
    r = seeded_client.post(f"/api/zones/{sample_zone_id}/tags", json={
        "add_tags": [{"key": "x" * 129, "value": "value"}],
    }, headers=seeded_auth_headers)
    assert r.status_code == 400


def test_tag_value_too_long(seeded_client, seeded_auth_headers, sample_zone_id):
    r = seeded_client.post(f"/api/zones/{sample_zone_id}/tags", json={
        "add_tags": [{"key": "key", "value": "x" * 257}],
    }, headers=seeded_auth_headers)
    assert r.status_code == 400


def test_tags_zone_not_found(seeded_client, seeded_auth_headers):
    r = seeded_client.post("/api/zones/INVALIDZONE/tags", json={
        "add_tags": [{"key": "K", "value": "V"}],
    }, headers=seeded_auth_headers)
    assert r.status_code == 404


def test_tags_cascade_on_zone_delete(seeded_client, seeded_auth_headers):
    r = seeded_client.post("/api/zones", json={
        "name": "cascade-tag-test.com",
        "caller_reference": "cascade-tag-ref",
    }, headers=seeded_auth_headers)
    zone_id = r.json()["id"]

    seeded_client.post(f"/api/zones/{zone_id}/tags", json={
        "add_tags": [{"key": "ShouldDelete", "value": "yes"}],
    }, headers=seeded_auth_headers)

    tag_resp = seeded_client.get(f"/api/zones/{zone_id}/tags", headers=seeded_auth_headers)
    assert len(tag_resp.json()["tags"]) == 1

    r = seeded_client.delete(f"/api/zones/{zone_id}", headers=seeded_auth_headers)
    assert r.status_code == 200

    r2 = seeded_client.delete(f"/api/zones/{zone_id}", headers=seeded_auth_headers)
    assert r2.status_code == 404
