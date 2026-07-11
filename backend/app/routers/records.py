import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.exceptions import (
    NoSuchHostedZone, NoSuchRecord, InvalidInput, InvalidChangeBatch,
)
from app.models import HostedZone, DNSRecord, Change
from app.schemas import (
    ChangeResourceRecordSetsRequest, RecordResponse, RecordListResponse,
    ChangeInfo, ChangeInfoResponse, UpdateRecordRequest,
)
from app.utils.auth import get_current_user
from app.utils.pagination import paginate
from app.utils.validation import validate_record_type, validate_record_value
from app.utils.bind_format import parse_bind_zone

router = APIRouter()


def _utcnow():
    return datetime.now(timezone.utc).isoformat()


def _record_to_response(record: DNSRecord) -> RecordResponse:
    return RecordResponse(
        id=record.id,
        zone_id=record.zone_id,
        name=record.name,
        type=record.type,
        ttl=record.ttl or 300,
        value=record.value,
        alias_target=record.alias_target,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def _get_zone_or_404(zone_id: str, db: Session) -> HostedZone:
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise NoSuchHostedZone()
    return zone


def _create_change(zone_id: str, db: Session, comment: str | None = None) -> Change:
    change = Change(
        zone_id=zone_id,
        status="PENDING",
        comment=comment or "",
    )
    db.add(change)
    return change


def _normalize_name(name: str) -> str:
    name = name.strip()
    if not name.endswith("."):
        name += "."
    return name


@router.post("/{zone_id}/records", response_model=ChangeInfoResponse)
def change_resource_record_sets(
    zone_id: str,
    request: ChangeResourceRecordSetsRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    zone = _get_zone_or_404(zone_id, db)
    change_batch = request.change_batch
    errors = []

    for i, change_item in enumerate(change_batch.changes):
        action = change_item.action
        rrs = change_item.resource_record_set

        if action not in ("CREATE", "DELETE", "UPSERT"):
            errors.append(f"Change {i}: Invalid action '{action}'. Must be CREATE, DELETE, or UPSERT.")

        if not rrs.name:
            errors.append(f"Change {i}: Resource record set name is required.")

        if action != "DELETE":
            try:
                validate_record_type(rrs.type)
            except InvalidInput as e:
                errors.append(f"Change {i}: {e.detail['message']}")

            if rrs.resource_records and rrs.alias_target:
                errors.append(f"Change {i}: Cannot specify both resource_records and alias_target.")
            elif not rrs.resource_records and not rrs.alias_target:
                errors.append(f"Change {i}: Either resource_records or alias_target is required.")

            if rrs.resource_records:
                values = [r.value for r in rrs.resource_records]
                try:
                    validate_record_value(rrs.type, values)
                except InvalidInput as e:
                    errors.append(f"Change {i}: {e.detail['message']}")

    if errors:
        raise InvalidChangeBatch(errors)

    for change_item in change_batch.changes:
        action = change_item.action
        rrs = change_item.resource_record_set
        name = _normalize_name(rrs.name)
        values = json.dumps([r.value for r in (rrs.resource_records or [])])
        alias_target = json.dumps(rrs.alias_target) if rrs.alias_target else None

        if action in ("CREATE", "UPSERT"):
            existing = db.query(DNSRecord).filter(
                DNSRecord.zone_id == zone_id,
                DNSRecord.name == name,
                DNSRecord.type == rrs.type,
            ).first()

            if action == "UPSERT" and existing:
                existing.ttl = rrs.ttl
                existing.value = values
                existing.alias_target = alias_target
                existing.updated_at = _utcnow()
            elif action == "UPSERT" and not existing:
                record = DNSRecord(
                    zone_id=zone_id,
                    name=name,
                    type=rrs.type,
                    ttl=rrs.ttl,
                    value=values,
                    alias_target=alias_target,
                )
                db.add(record)
            elif action == "CREATE":
                if existing:
                    errors.append(
                        f"A record with name '{name}' and type '{rrs.type}' already exists."
                    )
                    continue
                record = DNSRecord(
                    zone_id=zone_id,
                    name=name,
                    type=rrs.type,
                    ttl=rrs.ttl,
                    value=values,
                    alias_target=alias_target,
                )
                db.add(record)

        elif action == "DELETE":
            existing = db.query(DNSRecord).filter(
                DNSRecord.zone_id == zone_id,
                DNSRecord.name == name,
                DNSRecord.type == rrs.type,
            ).first()

            if not existing:
                errors.append(
                    f"No record found with name '{name}' and type '{rrs.type}' to delete."
                )
                continue

            if existing.type == "SOA":
                soa_count = db.query(DNSRecord).filter(
                    DNSRecord.zone_id == zone_id, DNSRecord.type == "SOA"
                ).count()
                if soa_count <= 1:
                    errors.append("Cannot delete the last SOA record.")
                    continue

            if existing.type == "NS":
                ns_count = db.query(DNSRecord).filter(
                    DNSRecord.zone_id == zone_id, DNSRecord.type == "NS"
                ).count()
                if ns_count <= 1:
                    errors.append("Cannot delete the last NS record.")
                    continue

            db.delete(existing)

    if errors:
        raise InvalidChangeBatch(errors)

    change = _create_change(zone_id, db, change_batch.comment)
    _recalculate_record_count(zone_id, db)
    db.commit()

    return ChangeInfoResponse(
        change_info=ChangeInfo(
            id=change.id,
            status=change.status,
            submitted_at=change.submitted_at,
            comment=change.comment,
        )
    )


@router.get("/{zone_id}/records", response_model=RecordListResponse)
def list_resource_record_sets(
    zone_id: str,
    search: str | None = Query(None),
    record_type: str | None = Query(None, alias="type"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=300),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    _get_zone_or_404(zone_id, db)
    query = db.query(DNSRecord).filter(DNSRecord.zone_id == zone_id)

    if search:
        query = query.filter(DNSRecord.name.ilike(f"%{search}%"))
    if record_type:
        query = query.filter(DNSRecord.type == record_type.upper())

    query = query.order_by(DNSRecord.name.asc(), DNSRecord.type.asc())
    result = paginate(query, page=page, size=size)
    records = [_record_to_response(r) for r in result["items"]]

    return RecordListResponse(
        records=records,
        total=result["total"],
        page=result["page"],
        size=result["size"],
        is_truncated=result["page"] < result["total_pages"],
    )


@router.get("/{zone_id}/records/{record_id}", response_model=RecordResponse)
def get_record(
    zone_id: str,
    record_id: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    _get_zone_or_404(zone_id, db)
    record = db.query(DNSRecord).filter(
        DNSRecord.id == record_id, DNSRecord.zone_id == zone_id
    ).first()
    if not record:
        raise NoSuchRecord()
    return _record_to_response(record)


@router.put("/{zone_id}/records/{record_id}", response_model=RecordResponse)
def update_record(
    zone_id: str,
    record_id: str,
    body: UpdateRecordRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    _get_zone_or_404(zone_id, db)
    record = db.query(DNSRecord).filter(
        DNSRecord.id == record_id, DNSRecord.zone_id == zone_id
    ).first()
    if not record:
        raise NoSuchRecord()

    if body.ttl is not None:
        record.ttl = body.ttl
    if body.value is not None:
        if record.type != "SOA":
            values = json.loads(body.value) if isinstance(body.value, str) else body.value
            try:
                validate_record_value(record.type, values if isinstance(values, list) else [values])
            except InvalidInput as e:
                raise e
        record.value = body.value if isinstance(body.value, str) else json.dumps(body.value)
    if body.alias_target is not None:
        record.alias_target = json.dumps(body.alias_target)

    record.updated_at = _utcnow()
    _create_change(zone_id, db, "Updated record")
    db.commit()

    return _record_to_response(record)


@router.delete("/{zone_id}/records/{record_id}", response_model=dict)
def delete_record(
    zone_id: str,
    record_id: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    _get_zone_or_404(zone_id, db)
    record = db.query(DNSRecord).filter(
        DNSRecord.id == record_id, DNSRecord.zone_id == zone_id
    ).first()
    if not record:
        raise NoSuchRecord()

    if record.type == "SOA":
        soa_count = db.query(DNSRecord).filter(
            DNSRecord.zone_id == zone_id, DNSRecord.type == "SOA"
        ).count()
        if soa_count <= 1:
            raise InvalidChangeBatch(["Cannot delete the last SOA record."])

    if record.type == "NS":
        ns_count = db.query(DNSRecord).filter(
            DNSRecord.zone_id == zone_id, DNSRecord.type == "NS"
        ).count()
        if ns_count <= 1:
            raise InvalidChangeBatch(["Cannot delete the last NS record."])

    db.delete(record)
    _create_change(zone_id, db, "Deleted record")
    _recalculate_record_count(zone_id, db)
    db.commit()

    return {"success": True}


def _recalculate_record_count(zone_id: str, db: Session):
    count = db.query(DNSRecord).filter(DNSRecord.zone_id == zone_id).count()
    db.query(HostedZone).filter(HostedZone.id == zone_id).update(
        {"resource_record_set_count": count}
    )


@router.post("/{zone_id}/import-bind")
def import_bind_zone(
    zone_id: str,
    body: dict,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    zone = _get_zone_or_404(zone_id, db)
    bind_text = body.get("zone_file", "")
    if not bind_text:
        raise InvalidInput("zone_file field is required.")

    parsed = parse_bind_zone(bind_text, zone.name)
    created = 0
    for rec in parsed:
        existing = db.query(DNSRecord).filter(
            DNSRecord.zone_id == zone_id,
            DNSRecord.name == rec["name"],
            DNSRecord.type == rec["type"],
        ).first()
        if not existing:
            dns_record = DNSRecord(
                zone_id=zone_id,
                name=rec["name"],
                type=rec["type"],
                ttl=rec["ttl"],
                value=rec["value"],
            )
            db.add(dns_record)
            created += 1

    _create_change(zone_id, db, f"Imported {created} records from BIND zone file")
    _recalculate_record_count(zone_id, db)
    db.commit()

    return {"imported": created, "total": len(parsed)}
