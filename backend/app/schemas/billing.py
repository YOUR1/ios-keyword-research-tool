from pydantic import BaseModel, ConfigDict

from app.schemas.auth import PlanOut


class PlanListOut(BaseModel):
    plans: list[PlanOut]


class UsageOut(BaseModel):
    keywords_used: int
    keywords_limit: int
    crawls_today: int
    crawls_limit: int
    results_stored: int
    results_limit: int
    plan: PlanOut
