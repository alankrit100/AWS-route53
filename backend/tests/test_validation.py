import pytest
from app.utils.validation import (
    validate_record_type, validate_record_value,
    VALID_RECORD_TYPES,
)


class TestValidateRecordType:
    def test_valid_types(self):
        for t in VALID_RECORD_TYPES:
            validate_record_type(t)

    def test_invalid_type(self):
        with pytest.raises(Exception):
            validate_record_type("INVALID")


class TestValidateA:
    def test_valid_a(self):
        validate_record_value("A", ["192.168.1.1"])
        validate_record_value("A", ["0.0.0.0"])
        validate_record_value("A", ["255.255.255.255"])
        validate_record_value("A", ["10.0.0.1", "172.16.0.1"])

    def test_invalid_a(self):
        with pytest.raises(Exception):
            validate_record_value("A", ["not-an-ip"])
        with pytest.raises(Exception):
            validate_record_value("A", ["256.1.1.1"])
        with pytest.raises(Exception):
            validate_record_value("A", ["1.2.3.4.5"])


class TestValidateAAAA:
    def test_valid_aaaa(self):
        validate_record_value("AAAA", ["2001:db8::1"])
        validate_record_value("AAAA", ["::1"])
        validate_record_value("AAAA", ["fe80::1"])

    def test_invalid_aaaa(self):
        with pytest.raises(Exception):
            validate_record_value("AAAA", ["not-ipv6"])
        with pytest.raises(Exception):
            validate_record_value("AAAA", ["192.168.1.1"])


class TestValidateMX:
    def test_valid_mx(self):
        validate_record_value("MX", ["10 mail.example.com."])
        validate_record_value("MX", ["0 mail.example.com."])
        validate_record_value("MX", ["65535 mail.example.com."])

    def test_invalid_mx(self):
        with pytest.raises(Exception):
            validate_record_value("MX", ["invalid"])
        with pytest.raises(Exception):
            validate_record_value("MX", ["not-a-number mail.example.com."])
        with pytest.raises(Exception):
            validate_record_value("MX", ["-1 mail.example.com."])


class TestValidateSRV:
    def test_valid_srv(self):
        validate_record_value("SRV", ["0 10 80 svc.example.com."])
        validate_record_value("SRV", ["10 50 5060 sip.example.com."])

    def test_invalid_srv(self):
        with pytest.raises(Exception):
            validate_record_value("SRV", ["invalid"])
        with pytest.raises(Exception):
            validate_record_value("SRV", ["0 10 svc.example.com."])
        with pytest.raises(Exception):
            validate_record_value("SRV", ["-1 10 80 svc.example.com."])


class TestValidateCAA:
    def test_valid_caa(self):
        validate_record_value("CAA", ["0 issue \"letsencrypt.org\""])
        validate_record_value("CAA", ["0 issuewild \"*\""])

    def test_invalid_caa(self):
        with pytest.raises(Exception):
            validate_record_value("CAA", ["invalid"])
        with pytest.raises(Exception):
            validate_record_value("CAA", ["-1 issue \"test\""])
        with pytest.raises(Exception):
            validate_record_value("CAA", ["0 invalidtag \"test\""])


class TestValidateEmpty:
    def test_empty_values(self):
        with pytest.raises(Exception):
            validate_record_value("A", [])


class TestValidateCNAME:
    def test_valid_cname(self):
        validate_record_value("CNAME", ["target.example.com."])

    def test_invalid_cname(self):
        with pytest.raises(Exception):
            validate_record_value("CNAME", [""])


class TestValidateTXT:
    def test_valid_txt(self):
        validate_record_value("TXT", ["\"v=spf1 include:_spf.google.com ~all\""])

    def test_invalid_txt(self):
        with pytest.raises(Exception):
            validate_record_value("TXT", [""])
