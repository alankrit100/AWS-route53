import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.exceptions import (
    HostedZoneAlreadyExists, HostedZoneNotEmpty, NoSuchHostedZone,
    InvalidInput, ConflictingDomainExists,
)
from app.models import HostedZone, DNSRecord, Change, Tag
from app.schemas import (
    CreateHostedZoneRequest, UpdateHostedZoneRequest,
    HostedZoneResponse, HostedZoneListResponse, HostedZoneConfig, DelegationSet,
    ChangeInfo, ChangeInfoResponse,
)
from app.utils.auth import get_current_user
from app.utils.pagination import paginate
from app.utils.bind_format import zone_to_bind, zone_to_json

router = APIRouter()

NAME_SERVERS = [
    "ns-1.awsdns-64.com",
    "ns-2.awsdns-65.net",
    "ns-3.awsdns-66.org",
    "ns-4.awsdns-67.co.uk",
]

SOA_TEMPLATE = "ns-1.awsdns-64.net. hostmaster.{zone_name} 1 7200 900 1209600 86400"


def _utcnow():
    return datetime.now(timezone.utc).isoformat()


def _zone_to_response(zone: HostedZone) -> HostedZoneResponse:
    return HostedZoneResponse(
        id=zone.id,
        name=zone.name,
        caller_reference=zone.caller_reference,
        config=HostedZoneConfig(
            comment=zone.comment or "",
            private_zone=bool(zone.private_zone),
        ),
        resource_record_set_count=zone.resource_record_set_count or 0,
        delegation_set=DelegationSet(name_servers=NAME_SERVERS),
        created_at=zone.created_at,
        updated_at=zone.updated_at,
    )


@router.post("", response_model=HostedZoneResponse, status_code=201)
def create_hosted_zone(
    request: CreateHostedZoneRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    existing = db.query(HostedZone).filter(
        HostedZone.caller_reference == request.caller_reference
    ).first()
    if existing:
        raise HostedZoneAlreadyExists()

    zone_name = request.name.strip()
    if not zone_name.endswith("."):
        zone_name += "."

    existing_name = db.query(HostedZone).filter(HostedZone.name == zone_name).first()
    if existing_name:
        raise ConflictingDomainExists()

    comment = ""
    private_zone = False
    if request.hosted_zone_config:
        comment = request.hosted_zone_config.comment or ""
        private_zone = request.hosted_zone_config.private_zone

    zone = HostedZone(
        name=zone_name,
        caller_reference=request.caller_reference,
        comment=comment,
        private_zone=1 if private_zone else 0,
    )
    db.add(zone)
    db.flush()

    soa_record = DNSRecord(
        zone_id=zone.id,
        name=zone_name,
        type="SOA",
        ttl=900,
        value=json.dumps([SOA_TEMPLATE.format(zone_name=zone_name.rstrip("."))]),
    )
    db.add(soa_record)

    ns_record = DNSRecord(
        zone_id=zone.id,
        name=zone_name,
        type="NS",
        ttl=172800,
        value=json.dumps(NAME_SERVERS),
    )
    db.add(ns_record)

    zone.resource_record_set_count = 2

    change = Change(
        zone_id=zone.id,
        status="PENDING",
        comment="Created hosted zone",
    )
    db.add(change)
    db.commit()

    return _zone_to_response(zone)


@router.get("", response_model=HostedZoneListResponse)
def list_hosted_zones(
    search: str | None = Query(None),
    hosted_zone_type: str | None = Query(None, alias="type"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(HostedZone)

    if search:
        query = query.filter(HostedZone.name.ilike(f"%{search}%"))
    if hosted_zone_type == "private":
        query = query.filter(HostedZone.private_zone == 1)
    elif hosted_zone_type == "public":
        query = query.filter(HostedZone.private_zone == 0)

    query = query.order_by(HostedZone.name.asc())
    result = paginate(query, page=page, size=size)

    zones = [_zone_to_response(z) for z in result["items"]]

    return HostedZoneListResponse(
        hosted_zones=zones,
        total=result["total"],
        page=result["page"],
        size=result["size"],
        is_truncated=result["page"] < result["total_pages"],
        next_marker=zones[-1].id if zones and result["page"] < result["total_pages"] else None,
    )


@router.get("/{zone_id}", response_model=HostedZoneResponse)
def get_hosted_zone(
    zone_id: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise NoSuchHostedZone()
    return _zone_to_response(zone)


@router.put("/{zone_id}", response_model=HostedZoneResponse)
def update_hosted_zone(
    zone_id: str,
    request: UpdateHostedZoneRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise NoSuchHostedZone()

    if request.comment is not None:
        if len(request.comment) > 256:
            raise InvalidInput("Comment must be 256 characters or fewer.")
        zone.comment = request.comment

    zone.updated_at = _utcnow()
    db.commit()
    return _zone_to_response(zone)


@router.delete("/{zone_id}", response_model=ChangeInfoResponse)
def delete_hosted_zone(
    zone_id: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise NoSuchHostedZone()

    non_essential = db.query(DNSRecord).filter(
        DNSRecord.zone_id == zone_id,
        ~DNSRecord.type.in_(["SOA", "NS"]),
    ).count()

    if non_essential > 0:
        raise HostedZoneNotEmpty()

    change = Change(
        zone_id=zone.id,
        status="PENDING",
        comment="Deleted hosted zone",
    )
    db.add(change)
    db.flush()

    result = ChangeInfoResponse(
        change_info=ChangeInfo(
            id=change.id,
            status=change.status,
            submitted_at=change.submitted_at,
            comment=change.comment,
        )
    )

    db.query(Tag).filter(
        Tag.resource_type == "hostedzone",
        Tag.resource_id == zone_id,
    ).delete()

    db.delete(zone)
    db.commit()

    return result


@router.get("/{zone_id}/export-bind")
def export_zone_bind(
    zone_id: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise NoSuchHostedZone()

    records = db.query(DNSRecord).filter(DNSRecord.zone_id == zone_id).all()
    record_dicts = [
        {"name": r.name, "type": r.type, "ttl": r.ttl, "value": r.value}
        for r in records
    ]

    bind_text = zone_to_bind(zone.name, record_dicts)
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(
        content=bind_text,
        headers={
            "Content-Disposition": f'attachment; filename="{zone.name.rstrip(".")}.zone"'
        },
    )


@router.get("/{zone_id}/export-json")
def export_zone_json(
    zone_id: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise NoSuchHostedZone()

    records = db.query(DNSRecord).filter(DNSRecord.zone_id == zone_id).all()
    record_dicts = [
        {"name": r.name, "type": r.type, "ttl": r.ttl, "value": r.value}
        for r in records
    ]

    return zone_to_json(zone.name, record_dicts)
