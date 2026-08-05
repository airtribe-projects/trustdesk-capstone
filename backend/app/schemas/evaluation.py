from pydantic import BaseModel


class EvaluationResult(BaseModel):
    ticket_id: str
    expected_category: str
    predicted_category: str
    passed: bool


class EvaluationResponse(BaseModel):
    total_cases: int
    passed: int
    failed: int
    accuracy: float
    results: list[EvaluationResult]