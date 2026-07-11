from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.exceptions import InvalidInput, NoSuchHostedZone
from app.models import HostedZone, Tag
from app.schemas import (
    ChangeTagsRequest, TagItem, TagResponse,
    ListTagsForResourcesRequest, ListTagsForResourcesResponse, ResourceTagSet,
)
from app.utils.auth import get_current_user

router = APIRouter()


@router.get("/zones/{zone_id}/tags", response_model=TagResponse)
def list_tags_for_zone(
    zone_id: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise NoSuchHostedZone()

    tags = db.query(Tag).filter(
        Tag.resource_type == "hostedzone",
        Tag.resource_id == zone_id,
    ).all()

    return TagResponse(tags=[TagItem(key=t.key, value=t.value) for t in tags])


@router.post("/zones/{zone_id}/tags", response_model=TagResponse)
def change_tags_for_zone(
    zone_id: str,
    request: ChangeTagsRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise NoSuchHostedZone()

    for tag_key in request.remove_tag_keys:
        db.query(Tag).filter(
            Tag.resource_type == "hostedzone",
            Tag.resource_id == zone_id,
            Tag.key == tag_key,
        ).delete()

    current_count = db.query(Tag).filter(
        Tag.resource_type == "hostedzone",
        Tag.resource_id == zone_id,
    ).count()

    for tag_item in request.add_tags:
        if len(tag_item.key) > 128:
            raise InvalidInput(f"Tag key '{tag_item.key}' exceeds maximum length of 128 characters.")
        if len(tag_item.value) > 256:
            raise InvalidInput(f"Tag value for '{tag_item.key}' exceeds maximum length of 256 characters.")

        existing = db.query(Tag).filter(
            Tag.resource_type == "hostedzone",
            Tag.resource_id == zone_id,
            Tag.key == tag_item.key,
        ).first()

        if existing:
            existing.value = tag_item.value
        else:
            if current_count >= 10:
                raise InvalidInput("Maximum of 10 tags per resource exceeded.")
            tag = Tag(
                resource_type="hostedzone",
                resource_id=zone_id,
                key=tag_item.key,
                value=tag_item.value,
            )
            db.add(tag)
            current_count += 1

    db.commit()

    tags = db.query(Tag).filter(
        Tag.resource_type == "hostedzone",
        Tag.resource_id == zone_id,
    ).all()

    return TagResponse(tags=[TagItem(key=t.key, value=t.value) for t in tags])


@router.post("/tags", response_model=ListTagsForResourcesResponse)
def list_tags_for_resources(
    request: ListTagsForResourcesRequest,
    resource_type: str = Query("hostedzone"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    if len(request.resource_ids) > 10:
        raise InvalidInput("Maximum of 10 resource IDs allowed per request.")

    tag_sets = []
    for rid in request.resource_ids:
        tags = db.query(Tag).filter(
            Tag.resource_type == resource_type,
            Tag.resource_id == rid,
        ).all()
        tag_sets.append(
            ResourceTagSet(
                resource_id=rid,
                resource_type=resource_type,
                tags=[TagItem(key=t.key, value=t.value) for t in tags],
            )
        )

    return ListTagsForResourcesResponse(resource_tag_sets=tag_sets)
