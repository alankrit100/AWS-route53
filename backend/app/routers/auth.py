import bcrypt
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.exceptions import Unauthorized
from app.models import User
from app.schemas import LoginRequest, LoginResponse, UserResponse
from app.utils.auth import create_token, get_current_user

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if not user:
        raise Unauthorized("Invalid username or password.")

    if not bcrypt.checkpw(request.password.encode(), user.password_hash.encode()):
        raise Unauthorized("Invalid username or password.")

    token = create_token(user)
    return LoginResponse(
        token=token,
        user={"id": user.id, "username": user.username},
    )


@router.post("/logout")
def logout(user: User = Depends(get_current_user)):
    return {"success": True}


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return UserResponse(id=user.id, username=user.username)
