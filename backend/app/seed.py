import json
import uuid
from datetime import datetime, timezone

import bcrypt
from sqlalchemy.orm import Session

from app.models import User, HostedZone, DNSRecord, Change, Tag


def _utcnow():
    return datetime.now(timezone.utc).isoformat()


def seed_database(db: Session):
    existing = db.query(HostedZone).first()
    if existing:
        return

    existing_admin = db.query(User).filter(User.username == "admin").first()
    if not existing_admin:
        admin = User(
            id="U" + uuid.uuid4().hex[:12].upper(),
            username="admin",
            password_hash=bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode(),
            created_at=_utcnow(),
        )
        db.add(admin)

    zones_data = [
        {
            "name": "example.com.",
            "caller_reference": "seed-ref-001",
            "comment": "Primary production domain",
            "records": [
                {"name": "example.com.", "type": "SOA", "ttl": 900,
                 "value": json.dumps(["ns-1.awsdns-64.net. hostmaster.example.com. 1 7200 900 1209600 86400"])},
                {"name": "example.com.", "type": "NS", "ttl": 172800,
                 "value": json.dumps(["ns-1.awsdns-64.net.", "ns-2.awsdns-65.org.", "ns-3.awsdns-66.com.", "ns-4.awsdns-67.co.uk."])},
                {"name": "example.com.", "type": "A", "ttl": 300,
                 "value": json.dumps(["93.184.216.34"])},
                {"name": "www.example.com.", "type": "A", "ttl": 300,
                 "value": json.dumps(["93.184.216.34"])},
                {"name": "mail.example.com.", "type": "MX", "ttl": 300,
                 "value": json.dumps(["10 mail.example.com."])},
                {"name": "app.example.com.", "type": "CNAME", "ttl": 300,
                 "value": json.dumps(["example.com."])},
            ],
            "tags": {"Environment": "Production", "Team": "Platform"},
        },
        {
            "name": "myapp.org.",
            "caller_reference": "seed-ref-002",
            "comment": "Staging environment",
            "records": [
                {"name": "myapp.org.", "type": "SOA", "ttl": 900,
                 "value": json.dumps(["ns-1.awsdns-64.net. hostmaster.myapp.org. 1 7200 900 1209600 86400"])},
                {"name": "myapp.org.", "type": "NS", "ttl": 172800,
                 "value": json.dumps(["ns-1.awsdns-64.net.", "ns-2.awsdns-65.org."])},
                {"name": "myapp.org.", "type": "A", "ttl": 300,
                 "value": json.dumps(["192.0.2.1"])},
                {"name": "api.myapp.org.", "type": "AAAA", "ttl": 300,
                 "value": json.dumps(["2001:db8::1"])},
                {"name": "www.myapp.org.", "type": "CNAME", "ttl": 300,
                 "value": json.dumps(["myapp.org."])},
            ],
            "tags": {"Environment": "Staging"},
        },
        {
            "name": "startup.io.",
            "caller_reference": "seed-ref-003",
            "comment": "Startup project",
            "records": [
                {"name": "startup.io.", "type": "SOA", "ttl": 900,
                 "value": json.dumps(["ns-1.awsdns-64.net. hostmaster.startup.io. 1 7200 900 1209600 86400"])},
                {"name": "startup.io.", "type": "NS", "ttl": 172800,
                 "value": json.dumps(["ns-1.awsdns-64.net.", "ns-2.awsdns-65.org.", "ns-3.awsdns-66.com."])},
                {"name": "startup.io.", "type": "A", "ttl": 60,
                 "value": json.dumps(["203.0.113.1", "203.0.113.2"])},
                {"name": "blog.startup.io.", "type": "CNAME", "ttl": 300,
                 "value": json.dumps(["startup.io."])},
                {"name": "startup.io.", "type": "TXT", "ttl": 300,
                 "value": json.dumps(["\"v=spf1 include:_spf.google.com ~all\""])},
                {"name": "_sip._tcp.startup.io.", "type": "SRV", "ttl": 300,
                 "value": json.dumps(["10 50 5060 sip.startup.io."])},
                {"name": "startup.io.", "type": "CAA", "ttl": 300,
                 "value": json.dumps(["0 issue \"letsencrypt.org\""])},
            ],
            "tags": {},
        },
    ]

    for zd in zones_data:
        zone = HostedZone(
            name=zd["name"],
            caller_reference=zd["caller_reference"],
            comment=zd["comment"],
        )
        db.add(zone)
        db.flush()

        for rd in zd["records"]:
            record = DNSRecord(
                zone_id=zone.id,
                name=rd["name"],
                type=rd["type"],
                ttl=rd["ttl"],
                value=rd["value"],
            )
            db.add(record)

        zone.resource_record_set_count = len(zd["records"])

        for k, v in zd["tags"].items():
            tag = Tag(
                resource_type="hostedzone",
                resource_id=zone.id,
                key=k,
                value=v,
            )
            db.add(tag)

        change = Change(
            zone_id=zone.id,
            status="INSYNC",
            comment=f"Initial seed for {zd['name']}",
        )
        db.add(change)

    db.commit()
