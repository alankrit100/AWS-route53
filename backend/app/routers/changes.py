from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.exceptions import NoSuchChange
from app.models import Change
from app.schemas import ChangeInfo, ChangeInfoResponse
from app.utils.auth import get_current_user

router = APIRouter()


@router.get("/{change_id}", response_model=ChangeInfoResponse)
def get_change(
    change_id: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    change = db.query(Change).filter(Change.id == change_id).first()
    if not change:
        raise NoSuchChange()

    if change.status == "PENDING":
        pass

    return ChangeInfoResponse(
        change_info=ChangeInfo(
            id=change.id,
            status=change.status,
            submitted_at=change.submitted_at,
            comment=change.comment,
        )
    )
