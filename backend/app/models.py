import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


def _utcnow():
    return datetime.now(timezone.utc).isoformat()


def _new_id(prefix: str = "") -> str:
    uid = uuid.uuid4().hex[:12].upper()
    return f"{prefix}{uid}"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: _new_id())
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(String, nullable=False, default=_utcnow)

    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String, primary_key=True, default=lambda: _new_id())
    token_hash = Column(String, unique=True, nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(String, nullable=False)
    created_at = Column(String, nullable=False, default=_utcnow)

    user = relationship("User", back_populates="refresh_tokens")


class HostedZone(Base):
    __tablename__ = "hosted_zones"

    id = Column(String, primary_key=True, default=lambda: _new_id("Z"))
    name = Column(String, nullable=False, index=True)
    caller_reference = Column(String, unique=True, nullable=False)
    comment = Column(Text, default="")
    private_zone = Column(Integer, default=0)
    resource_record_set_count = Column(Integer, default=0)
    created_at = Column(String, nullable=False, default=_utcnow)
    updated_at = Column(String, nullable=False, default=_utcnow)

    records = relationship("DNSRecord", back_populates="zone", cascade="all, delete-orphan",
                           passive_deletes=True)
    changes = relationship("Change", back_populates="zone", cascade="all, delete-orphan",
                           passive_deletes=True)
    tags = relationship("Tag", back_populates="zone", cascade="all, delete-orphan",
                        passive_deletes=True,
                        primaryjoin="and_(Tag.resource_type=='hostedzone', "
                                    "foreign(Tag.resource_id)==HostedZone.id)")


class DNSRecord(Base):
    __tablename__ = "dns_records"

    id = Column(String, primary_key=True, default=lambda: _new_id())
    zone_id = Column(String, ForeignKey("hosted_zones.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False)
    ttl = Column(Integer, default=300)
    value = Column(Text, nullable=False)
    alias_target = Column(Text, nullable=True)
    created_at = Column(String, nullable=False, default=_utcnow)
    updated_at = Column(String, nullable=False, default=_utcnow)

    zone = relationship("HostedZone", back_populates="records")


class Change(Base):
    __tablename__ = "changes"

    id = Column(String, primary_key=True, default=lambda: _new_id("C"))
    zone_id = Column(String, ForeignKey("hosted_zones.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, nullable=False, default="PENDING")
    comment = Column(Text, default="")
    submitted_at = Column(String, nullable=False, default=_utcnow)

    zone = relationship("HostedZone", back_populates="changes")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(String, primary_key=True, default=lambda: _new_id())
    resource_type = Column(String, nullable=False)
    resource_id = Column(String, nullable=False)
    key = Column(String, nullable=False)
    value = Column(String, nullable=False)

    __table_args__ = (
        UniqueConstraint("resource_type", "resource_id", "key"),
    )

    zone = relationship(
        "HostedZone",
        back_populates="tags",
        primaryjoin="and_(Tag.resource_type=='hostedzone', foreign(Tag.resource_id)==HostedZone.id)",
        uselist=False,
        viewonly=True,
    )
