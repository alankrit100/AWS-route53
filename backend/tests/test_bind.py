from app.utils.bind_format import zone_to_bind, parse_bind_zone
import json


class TestBindExport:
    def test_export_basic(self):
        records = [
            {"name": "example.com.", "type": "SOA", "ttl": 900,
             "value": json.dumps(["ns1.example.com. admin.example.com. 1 7200 900 1209600 86400"])},
            {"name": "example.com.", "type": "A", "ttl": 300,
             "value": json.dumps(["192.168.1.1"])},
            {"name": "www.example.com.", "type": "A", "ttl": 300,
             "value": json.dumps(["192.168.1.2"])},
        ]
        result = zone_to_bind("example.com.", records)
        assert "$ORIGIN example.com." in result
        assert "$TTL 3600" in result
        assert "192.168.1.1" in result
        assert "192.168.1.2" in result

    def test_export_txt(self):
        records = [
            {"name": "example.com.", "type": "TXT", "ttl": 300,
             "value": json.dumps(["\"v=spf1 include:_spf.google.com ~all\""])},
        ]
        result = zone_to_bind("example.com.", records)
        assert "v=spf1" in result


class TestBindImport:
    def test_import_basic(self):
        bind_text = """$ORIGIN example.com.
$TTL 3600
@  IN  A  192.168.1.1
www  IN  A  192.168.1.2
"""
        records = parse_bind_zone(bind_text, "example.com.")
        assert len(records) == 2
        assert records[0]["type"] == "A"
        assert records[0]["name"] == "example.com."

    def test_import_with_ttl(self):
        bind_text = """$ORIGIN test.org.
@  300  IN  A  10.0.0.1
"""
        records = parse_bind_zone(bind_text, "test.org.")
        assert len(records) == 1
        assert records[0]["ttl"] == 300
        assert records[0]["name"] == "test.org."

    def test_import_soa(self):
        bind_text = """$ORIGIN mydomain.net.
@  IN  SOA  ns1.mydomain.net. admin.mydomain.net. 2024010101 7200 900 1209600 86400
@  IN  NS   ns1.mydomain.net.
"""
        records = parse_bind_zone(bind_text, "mydomain.net.")
        assert len(records) == 2
        assert records[0]["type"] == "SOA"

    def test_import_empty(self):
        import pytest
        from app.exceptions import InvalidInput
        with pytest.raises(InvalidInput):
            parse_bind_zone("", "example.com.")

    def test_import_mx(self):
        bind_text = """$ORIGIN example.com.
@  IN  MX  10 mail.example.com.
"""
        records = parse_bind_zone(bind_text, "example.com.")
        assert len(records) == 1
        assert records[0]["type"] == "MX"
        assert "mail.example.com." in records[0]["value"]

    def test_import_comments(self):
        bind_text = """$ORIGIN example.com.
; This is a comment
@  IN  A  192.168.1.1
# Another comment
www  IN  A  192.168.1.2
"""
        records = parse_bind_zone(bind_text, "example.com.")
        assert len(records) == 2
