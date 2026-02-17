from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import Category, Country
from app.schemas.schemas import CategoryOut, CountryOut

router = APIRouter()


@router.get("", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    """List all app categories."""
    result = await db.execute(select(Category).order_by(Category.name))
    return result.scalars().all()


@router.get("/countries", response_model=list[CountryOut])
async def list_countries(db: AsyncSession = Depends(get_db)):
    """List all countries with data."""
    result = await db.execute(
        select(Country).where(Country.active.is_(True)).order_by(Country.name)
    )
    return result.scalars().all()
