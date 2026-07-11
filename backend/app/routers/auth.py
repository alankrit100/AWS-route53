import bcrypt
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.exceptions import Route53Exception, Unauthorized
from app.models import User
from app.schemas import (
    LoginRequest,
    SignupRequest,
    TokenResponse,
    RefreshRequest,
    LoginResponse,
    UserResponse,
)
from app.utils.auth import (
    create_token,
    create_refresh_token,
    validate_refresh_token,
    clear_user_refresh_tokens,
    get_current_user,
)

router = APIRouter()


@router.post("/signup", response_model=TokenResponse)
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    if len(request.username.strip()) < 3:
        raise Route53Exception(400, "InvalidInput", "Username must be at least 3 characters.")
    if len(request.password) < 6:
        raise Route53Exception(400, "InvalidInput", "Password must be at least 6 characters.")

    existing = db.query(User).filter(User.username == request.username).first()
    if existing:
        raise Route53Exception(409, "AlreadyExists", "Username is already taken.")

    user = User(
        username=request.username.strip(),
        password_hash=bcrypt.hashpw(request.password.encode(), bcrypt.gensalt()).decode(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_token(user)
    refresh_token = create_refresh_token(user.id, db)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={"id": user.id, "username": user.username},
    )


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if not user:
        raise Unauthorized("Invalid username or password.")

    if not bcrypt.checkpw(request.password.encode(), user.password_hash.encode()):
        raise Unauthorized("Invalid username or password.")

    access_token = create_token(user)
    refresh_token = create_refresh_token(user.id, db)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={"id": user.id, "username": user.username},
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(request: RefreshRequest, db: Session = Depends(get_db)):
    user = validate_refresh_token(request.refresh_token, db)
    access_token = create_token(user)
    refresh_token = create_refresh_token(user.id, db)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user={"id": user.id, "username": user.username},
    )


@router.post("/logout")
def logout(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    clear_user_refresh_tokens(user.id, db)
    return {"success": True}


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return UserResponse(id=user.id, username=user.username)
