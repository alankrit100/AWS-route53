import json


def _create_zone(client, headers, name, ref):
    r = client.post("/api/zones", json={
        "name": name,
        "caller_reference": ref,
    }, headers=headers)
    return r.json()["id"]


def _create_record(client, headers, zone_id, name, rtype, values, ttl=300):
    return client.post(f"/api/zones/{zone_id}/records", json={
        "change_batch": {
            "changes": [{
                "action": "CREATE",
                "resource_record_set": {
                    "name": name,
                    "type": rtype,
                    "ttl": ttl,
                    "resource_records": [{"value": v} for v in values],
                },
            }],
        },
    }, headers=headers)


class TestRecordTypes:
    def test_create_a_record(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = _create_record(seeded_client, seeded_auth_headers, sample_zone_id,
                           "www.a-test.com", "A", ["192.168.1.1"])
        assert r.status_code == 200

    def test_create_aaaa_record(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = _create_record(seeded_client, seeded_auth_headers, sample_zone_id,
                           "www.aaaa-test.com", "AAAA", ["2001:db8::1"])
        assert r.status_code == 200

    def test_create_cname_record(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = _create_record(seeded_client, seeded_auth_headers, sample_zone_id,
                           "www.cname-test.com", "CNAME", ["target.example.com."])
        assert r.status_code == 200

    def test_create_txt_record(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = _create_record(seeded_client, seeded_auth_headers, sample_zone_id,
                           "txt-test.com", "TXT", ["\"v=spf1 include:_spf.google.com ~all\""])
        assert r.status_code == 200

    def test_create_mx_record(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = _create_record(seeded_client, seeded_auth_headers, sample_zone_id,
                           "mx-test.com", "MX", ["10 mail.example.com."])
        assert r.status_code == 200

    def test_create_ns_record(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = _create_record(seeded_client, seeded_auth_headers, sample_zone_id,
                           "ns-test.com", "NS", ["ns1.example.com."])
        assert r.status_code == 200

    def test_create_ptr_record(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = _create_record(seeded_client, seeded_auth_headers, sample_zone_id,
                           "ptr-test.com", "PTR", ["host.example.com."])
        assert r.status_code == 200

    def test_create_srv_record(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = _create_record(seeded_client, seeded_auth_headers, sample_zone_id,
                           "_srv._tcp.srv-test.com", "SRV", ["0 10 80 svc.example.com."])
        assert r.status_code == 200

    def test_create_caa_record(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = _create_record(seeded_client, seeded_auth_headers, sample_zone_id,
                           "caa-test.com", "CAA", ["0 issue \"letsencrypt.org\""])
        assert r.status_code == 200


class TestRecordValidation:
    def test_invalid_a_format(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = _create_record(seeded_client, seeded_auth_headers, sample_zone_id,
                           "bad-a.com", "A", ["not-an-ip"])
        assert r.status_code == 400

    def test_invalid_aaaa_format(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = _create_record(seeded_client, seeded_auth_headers, sample_zone_id,
                           "bad-aaaa.com", "AAAA", ["not-an-ipv6"])
        assert r.status_code == 400

    def test_invalid_mx_format(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = _create_record(seeded_client, seeded_auth_headers, sample_zone_id,
                           "bad-mx.com", "MX", ["invalid"])
        assert r.status_code == 400

    def test_invalid_srv_format(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = _create_record(seeded_client, seeded_auth_headers, sample_zone_id,
                           "bad-srv.com", "SRV", ["invalid"])
        assert r.status_code == 400

    def test_invalid_caa_format(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = _create_record(seeded_client, seeded_auth_headers, sample_zone_id,
                           "bad-caa.com", "CAA", ["invalid"])
        assert r.status_code == 400

    def test_invalid_record_type(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = _create_record(seeded_client, seeded_auth_headers, sample_zone_id,
                           "bad-type.com", "INVALID", ["value"])
        assert r.status_code == 400

    def test_missing_name(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = seeded_client.post(f"/api/zones/{sample_zone_id}/records", json={
            "change_batch": {
                "changes": [{
                    "action": "CREATE",
                    "resource_record_set": {
                        "name": "",
                        "type": "A",
                        "ttl": 300,
                        "resource_records": [{"value": "192.168.1.1"}],
                    },
                }],
            },
        }, headers=seeded_auth_headers)
        assert r.status_code == 400

    def test_empty_values(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = seeded_client.post(f"/api/zones/{sample_zone_id}/records", json={
            "change_batch": {
                "changes": [{
                    "action": "CREATE",
                    "resource_record_set": {
                        "name": "empty.com",
                        "type": "A",
                        "ttl": 300,
                        "resource_records": [],
                    },
                }],
            },
        }, headers=seeded_auth_headers)
        assert r.status_code == 400


class TestRecordOperations:
    def test_list_records(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = seeded_client.get(f"/api/zones/{sample_zone_id}/records", headers=seeded_auth_headers)
        assert r.status_code == 200
        assert len(r.json()["records"]) > 0

    def test_list_records_search(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = seeded_client.get(
            f"/api/zones/{sample_zone_id}/records?search=SOA",
            headers=seeded_auth_headers
        )
        assert r.status_code == 200
        for rec in r.json()["records"]:
            assert "SOA" in rec["name"] or rec["type"] == "SOA" or "SOA" in rec["value"]

    def test_list_records_filter_by_type(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = seeded_client.get(
            f"/api/zones/{sample_zone_id}/records?type=A",
            headers=seeded_auth_headers
        )
        assert r.status_code == 200
        assert all(rec["type"] == "A" for rec in r.json()["records"])

    def test_get_single_record(self, seeded_client, seeded_auth_headers, sample_zone_id):
        list_r = seeded_client.get(f"/api/zones/{sample_zone_id}/records", headers=seeded_auth_headers)
        record_id = list_r.json()["records"][0]["id"]
        r = seeded_client.get(f"/api/zones/{sample_zone_id}/records/{record_id}", headers=seeded_auth_headers)
        assert r.status_code == 200
        assert r.json()["id"] == record_id

    def test_get_record_not_found(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = seeded_client.get(
            f"/api/zones/{sample_zone_id}/records/INVALID-RECORD",
            headers=seeded_auth_headers
        )
        assert r.status_code == 404

    def test_delete_record(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = _create_record(seeded_client, seeded_auth_headers, sample_zone_id,
                           "delete-me.com", "A", ["10.0.0.1"])
        list_r = seeded_client.get(
            f"/api/zones/{sample_zone_id}/records?search=delete-me.com",
            headers=seeded_auth_headers
        )
        record_id = list_r.json()["records"][0]["id"]
        r = seeded_client.delete(
            f"/api/zones/{sample_zone_id}/records/{record_id}",
            headers=seeded_auth_headers
        )
        assert r.status_code == 200

    def test_delete_nonexistent_record(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = seeded_client.delete(
            f"/api/zones/{sample_zone_id}/records/INVALID-RECORD",
            headers=seeded_auth_headers
        )
        assert r.status_code == 404

    def test_upsert_updates_existing(self, seeded_client, seeded_auth_headers, sample_zone_id):
        _create_record(seeded_client, seeded_auth_headers, sample_zone_id,
                       "upsert-test.com", "A", ["10.0.0.1"])
        r = seeded_client.post(f"/api/zones/{sample_zone_id}/records", json={
            "change_batch": {
                "changes": [{
                    "action": "UPSERT",
                    "resource_record_set": {
                        "name": "upsert-test.com",
                        "type": "A",
                        "ttl": 600,
                        "resource_records": [{"value": "10.0.0.2"}],
                    },
                }],
            },
        }, headers=seeded_auth_headers)
        assert r.status_code == 200

    def test_batch_create_multiple(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = seeded_client.post(f"/api/zones/{sample_zone_id}/records", json={
            "change_batch": {
                "changes": [
                    {
                        "action": "CREATE",
                        "resource_record_set": {
                            "name": "batch-a.com", "type": "A", "ttl": 300,
                            "resource_records": [{"value": "10.0.0.1"}],
                        },
                    },
                    {
                        "action": "CREATE",
                        "resource_record_set": {
                            "name": "batch-b.com", "type": "A", "ttl": 300,
                            "resource_records": [{"value": "10.0.0.2"}],
                        },
                    },
                ],
            },
        }, headers=seeded_auth_headers)
        assert r.status_code == 200

    def test_invalid_action(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = seeded_client.post(f"/api/zones/{sample_zone_id}/records", json={
            "change_batch": {
                "changes": [{
                    "action": "INVALID",
                    "resource_record_set": {
                        "name": "test.com", "type": "A", "ttl": 300,
                        "resource_records": [{"value": "10.0.0.1"}],
                    },
                }],
            },
        }, headers=seeded_auth_headers)
        assert r.status_code == 400

    def test_records_invalid_zone(self, seeded_client, seeded_auth_headers):
        r = seeded_client.get("/api/zones/INVALIDZONE/records", headers=seeded_auth_headers)
        assert r.status_code == 404

    def test_change_returns_change_info(self, seeded_client, seeded_auth_headers, sample_zone_id):
        r = _create_record(seeded_client, seeded_auth_headers, sample_zone_id,
                           "change-info-test.com", "A", ["10.0.0.1"])
        data = r.json()
        assert "change_info" in data
        assert data["change_info"]["status"] == "PENDING"

    def test_soa_protection(self, seeded_client, seeded_auth_headers, sample_zone_id):
        list_r = seeded_client.get(f"/api/zones/{sample_zone_id}/records", headers=seeded_auth_headers)
        soa_records = [r for r in list_r.json()["records"] if r["type"] == "SOA"]
        for soa in soa_records:
            r = seeded_client.delete(
                f"/api/zones/{sample_zone_id}/records/{soa['id']}",
                headers=seeded_auth_headers
            )
            assert r.status_code == 400

    def test_ns_protection(self, seeded_client, seeded_auth_headers, sample_zone_id):
        list_r = seeded_client.get(f"/api/zones/{sample_zone_id}/records", headers=seeded_auth_headers)
        ns_records = [r for r in list_r.json()["records"] if r["type"] == "NS"]
        if len(ns_records) == 1:
            r = seeded_client.delete(
                f"/api/zones/{sample_zone_id}/records/{ns_records[0]['id']}",
                headers=seeded_auth_headers
            )
            assert r.status_code == 400

    def test_update_ttl(self, seeded_client, seeded_auth_headers, sample_zone_id):
        list_r = seeded_client.get(f"/api/zones/{sample_zone_id}/records", headers=seeded_auth_headers)
        record = list_r.json()["records"][0]
        r = seeded_client.put(
            f"/api/zones/{sample_zone_id}/records/{record['id']}",
            json={"ttl": 999},
            headers=seeded_auth_headers
        )
        assert r.status_code == 200
        assert r.json()["ttl"] == 999


class TestRecordPagination:
    def test_records_pagination(self, seeded_client, seeded_auth_headers):
        r = seeded_client.get("/api/zones", headers=seeded_auth_headers)
        zones = r.json()["hosted_zones"]
        zone_id = zones[0]["id"]
        r = seeded_client.get(f"/api/zones/{zone_id}/records?page=1&size=2", headers=seeded_auth_headers)
        data = r.json()
        assert len(data["records"]) <= 2
        assert "is_truncated" in data
