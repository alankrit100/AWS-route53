from datetime import datetime
from pydantic import BaseModel, Field
from typing import Any


# --- Auth ---
class LoginRequest(BaseModel):
    username: str
    password: str


class SignupRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


class LoginResponse(BaseModel):
    token: str
    user: dict


class UserResponse(BaseModel):
    id: str
    username: str


# --- Hosted Zones ---
class HostedZoneConfig(BaseModel):
    comment: str | None = None
    private_zone: bool = False


class CreateHostedZoneRequest(BaseModel):
    name: str
    caller_reference: str
    hosted_zone_config: HostedZoneConfig | None = None


class UpdateHostedZoneRequest(BaseModel):
    comment: str | None = None


class DelegationSet(BaseModel):
    name_servers: list[str]


class HostedZoneResponse(BaseModel):
    id: str
    name: str
    caller_reference: str
    config: HostedZoneConfig | None = None
    resource_record_set_count: int = 0
    delegation_set: DelegationSet | None = None
    created_at: str
    updated_at: str


class HostedZoneListResponse(BaseModel):
    hosted_zones: list[HostedZoneResponse]
    total: int
    page: int
    size: int
    is_truncated: bool
    next_marker: str | None = None


# --- DNS Records ---
class ResourceRecord(BaseModel):
    value: str


class ResourceRecordSet(BaseModel):
    name: str
    type: str
    ttl: int = 300
    resource_records: list[ResourceRecord] = []
    alias_target: dict | None = None


class Change(BaseModel):
    action: str  # CREATE | DELETE | UPSERT
    resource_record_set: ResourceRecordSet


class UpdateRecordRequest(BaseModel):
    ttl: int | None = None
    value: str | None = None
    alias_target: dict | None = None


class ChangeBatch(BaseModel):
    changes: list[Change]
    comment: str | None = None


class ChangeResourceRecordSetsRequest(BaseModel):
    change_batch: ChangeBatch


class RecordResponse(BaseModel):
    id: str
    zone_id: str
    name: str
    type: str
    ttl: int
    value: str
    alias_target: str | None = None
    created_at: str
    updated_at: str


class RecordListResponse(BaseModel):
    records: list[RecordResponse]
    total: int
    page: int
    size: int
    is_truncated: bool


# --- Tags ---
class TagItem(BaseModel):
    key: str
    value: str


class ChangeTagsRequest(BaseModel):
    add_tags: list[TagItem] = []
    remove_tag_keys: list[str] = []


class TagResponse(BaseModel):
    tags: list[TagItem]


class ResourceTagSet(BaseModel):
    resource_id: str
    resource_type: str
    tags: list[TagItem]


class ListTagsForResourcesRequest(BaseModel):
    resource_ids: list[str]


class ListTagsForResourcesResponse(BaseModel):
    resource_tag_sets: list[ResourceTagSet]


# --- Changes ---
class ChangeInfo(BaseModel):
    id: str
    status: str
    submitted_at: str
    comment: str | None = None


class ChangeInfoResponse(BaseModel):
    change_info: ChangeInfo
