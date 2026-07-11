import json
import re
from datetime import datetime, timezone

from app.exceptions import InvalidInput


def zone_to_bind(zone_name: str, records: list) -> str:
    zone_name = zone_name.rstrip(".")
    ttl = 3600
    lines = []
    lines.append(f"$ORIGIN {zone_name}.")
    lines.append(f"$TTL {ttl}")
    lines.append("")

    for rec in records:
        name = rec["name"].rstrip(".")
        if name == zone_name:
            name = "@"
        else:
            if name.endswith(zone_name):
                name = name[: -len(zone_name) - 1]

        rtype = rec["type"]
        ttl_val = rec.get("ttl", ttl)
        try:
            values = json.loads(rec["value"])
        except (json.JSONDecodeError, TypeError):
            values = [rec["value"]]

        for val in values:
            if rtype == "TXT":
                val = '"' + val.strip('"') + '"'
            lines.append(f"{name:<30} IN  {rtype:<8} {ttl_val:<6} {val}")

    lines.append("")
    return "\n".join(lines)


def zone_to_json(zone_name: str, records: list) -> dict:
    parsed = []
    for rec in records:
        try:
            values = json.loads(rec["value"])
        except (json.JSONDecodeError, TypeError):
            values = [rec["value"]]
        parsed.append({
            "name": rec["name"],
            "type": rec["type"],
            "ttl": rec.get("ttl", 300),
            "values": values,
        })
    return {
        "zone_name": zone_name,
        "records": parsed,
        "exported_at": datetime.now(timezone.utc).isoformat(),
    }


def parse_bind_zone(text: str, zone_name: str) -> list[dict]:
    zone_name = zone_name.rstrip(".")
    records = []
    default_ttl = 3600
    origin = zone_name

    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith(";") or line.startswith("#"):
            continue

        if line.upper().startswith("$TTL"):
            parts = line.split()
            if len(parts) >= 2:
                try:
                    default_ttl = int(parts[1])
                except ValueError:
                    pass
            continue

        if line.upper().startswith("$ORIGIN"):
            parts = line.split()
            if len(parts) >= 2:
                origin = parts[1].rstrip(".")
            continue

        parts = line.split()
        if len(parts) < 4:
            continue

        name = parts[0]
        ttl = default_ttl
        idx = 1

        if parts[idx].isdigit():
            ttl = int(parts[idx])
            idx += 1

        if parts[idx].upper() == "IN":
            idx += 1

        rtype = parts[idx].upper()
        idx += 1

        value = " ".join(parts[idx:])
        if value.startswith('"') and value.endswith('"'):
            value = f'"{value[1:-1].strip()}"'

        if name == "@":
            fqdn = f"{origin}."
        elif name.endswith("."):
            fqdn = name
        else:
            fqdn = f"{name}.{origin}."

        records.append({
            "name": fqdn,
            "type": rtype,
            "ttl": ttl,
            "value": json.dumps([value]),
        })

    if not records:
        raise InvalidInput("No valid records found in BIND zone file.")

    return records
