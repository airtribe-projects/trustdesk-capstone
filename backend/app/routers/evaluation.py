from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.services.evaluation_service import run_evaluation

router = APIRouter(
    prefix="/eval-runs",
    tags=["Evaluation"]
)


@router.post("")
def evaluate(
    db: Session = Depends(get_db)
):
    return run_evaluation(db)