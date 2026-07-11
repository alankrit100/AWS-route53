import ipaddress
import re
from typing import Literal

from app.exceptions import InvalidInput

VALID_RECORD_TYPES = {"A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"}


def validate_record_type(record_type: str):
    if record_type not in VALID_RECORD_TYPES:
        raise InvalidInput(
            f"Invalid record type '{record_type}'. "
            f"Supported types: {', '.join(sorted(VALID_RECORD_TYPES))}."
        )


def validate_record_value(record_type: str, values: list[str]):
    if not values:
        raise InvalidInput("At least one value is required.")

    validator_map = {
        "A": _validate_a,
        "AAAA": _validate_aaaa,
        "CNAME": _validate_fqdn,
        "TXT": _validate_txt,
        "MX": _validate_mx,
        "NS": _validate_fqdn,
        "PTR": _validate_fqdn,
        "SRV": _validate_srv,
        "CAA": _validate_caa,
    }

    validator = validator_map.get(record_type)
    if validator:
        for value in values:
            validator(value)


def _validate_a(value: str):
    try:
        ipaddress.IPv4Address(value)
    except ipaddress.AddressValueError:
        raise InvalidInput(f"'{value}' is not a valid IPv4 address for A record.")


def _validate_aaaa(value: str):
    try:
        ipaddress.IPv6Address(value)
    except ipaddress.AddressValueError:
        raise InvalidInput(f"'{value}' is not a valid IPv6 address for AAAA record.")


def _validate_fqdn(value: str):
    if not value or len(value) > 255:
        raise InvalidInput(f"'{value}' is not a valid fully qualified domain name.")
    parts = value.rstrip(".").split(".")
    if len(parts) < 2:
        raise InvalidInput(f"'{value}' is not a valid fully qualified domain name.")
    for part in parts:
        if not part or len(part) > 63:
            raise InvalidInput(f"'{value}' contains an invalid label.")
        if not re.match(r'^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$', part):
            raise InvalidInput(f"'{value}' contains an invalid label.")


def _validate_txt(value: str):
    if not value:
        raise InvalidInput("TXT record value cannot be empty.")


def _validate_mx(value: str):
    parts = value.strip().split()
    if len(parts) < 2:
        raise InvalidInput(f"MX record must have format: '<priority> <domain>'. Got: '{value}'")
    try:
        priority = int(parts[0])
        if priority < 0 or priority > 65535:
            raise InvalidInput(f"MX priority must be between 0 and 65535.")
    except ValueError:
        raise InvalidInput(f"MX priority must be an integer. Got: '{parts[0]}'")
    _validate_fqdn(parts[1])


def _validate_srv(value: str):
    parts = value.strip().split()
    if len(parts) != 4:
        raise InvalidInput(
            f"SRV record must have format: '<priority> <weight> <port> <target>'. Got: '{value}'"
        )
    try:
        priority = int(parts[0])
        weight = int(parts[1])
        port = int(parts[2])
        if priority < 0 or priority > 65535:
            raise InvalidInput(f"SRV priority must be between 0 and 65535.")
        if weight < 0 or weight > 65535:
            raise InvalidInput(f"SRV weight must be between 0 and 65535.")
        if port < 0 or port > 65535:
            raise InvalidInput(f"SRV port must be between 0 and 65535.")
    except ValueError:
        raise InvalidInput(f"SRV priority, weight, and port must be integers.")
    _validate_fqdn(parts[3])


def _validate_caa(value: str):
    parts = value.strip().split()
    if len(parts) != 3:
        raise InvalidInput(
            f"CAA record must have format: '<flags> <tag> <value>'. Got: '{value}'"
        )
    try:
        flags = int(parts[0])
        if flags < 0 or flags > 255:
            raise InvalidInput(f"CAA flags must be between 0 and 255.")
    except ValueError:
        raise InvalidInput(f"CAA flags must be an integer.")

    tag = parts[1]
    if tag not in ("issue", "issuewild", "iodef"):
        raise InvalidInput(f"CAA tag must be one of: issue, issuewild, iodef. Got: '{tag}'")

    caa_value = parts[2]
    if not caa_value:
        raise InvalidInput(f"CAA value cannot be empty.")
