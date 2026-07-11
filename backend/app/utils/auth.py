from datetime import datetime, timedelta, timezone
import secrets

import bcrypt
import jwt
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.exceptions import Unauthorized
from app.models import User, RefreshToken

bearer_scheme = HTTPBearer(auto_error=False)

ALGORITHM = "HS256"


def create_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user.id,
        "username": user.username,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: str, db: Session) -> str:
    raw = secrets.token_hex(32)
    hashed = bcrypt.hashpw(raw.encode(), bcrypt.gensalt()).decode()
    expires_at = (datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)).isoformat()

    rt = RefreshToken(
        token_hash=hashed,
        user_id=user_id,
        expires_at=expires_at,
    )
    db.add(rt)
    db.commit()
    return raw


def validate_refresh_token(raw: str, db: Session) -> User:
    tokens = db.query(RefreshToken).join(User).filter(User.id == RefreshToken.user_id).all()
    for rt in tokens:
        if bcrypt.checkpw(raw.encode(), rt.token_hash.encode()):
            if datetime.fromisoformat(rt.expires_at) < datetime.now(timezone.utc):
                raise Unauthorized("Refresh token has expired.")
            return rt.user
    raise Unauthorized("Invalid refresh token.")


def clear_user_refresh_tokens(user_id: str, db: Session):
    db.query(RefreshToken).filter(RefreshToken.user_id == user_id).delete()
    db.commit()


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise Unauthorized("Authentication required.")
    try:
        payload = jwt.decode(credentials.credentials, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise Unauthorized("Token has expired.")
    except jwt.InvalidTokenError:
        raise Unauthorized("Invalid token.")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise Unauthorized("User not found.")
    return user
