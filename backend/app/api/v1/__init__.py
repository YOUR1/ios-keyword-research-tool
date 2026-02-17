from fastapi import APIRouter
from app.api.v1 import apps, categories, health, auth, keywords, results, crawls, billing, admin, reviews

router = APIRouter()
router.include_router(health.router, tags=["health"])
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(apps.router, prefix="/apps", tags=["apps"])
router.include_router(reviews.router, prefix="/apps", tags=["reviews"])
router.include_router(categories.router, prefix="/categories", tags=["categories"])
router.include_router(keywords.router, prefix="/keywords", tags=["keywords"])
router.include_router(results.router, prefix="/results", tags=["results"])
router.include_router(crawls.router, prefix="/crawls", tags=["crawls"])
router.include_router(billing.router, prefix="/billing", tags=["billing"])
router.include_router(admin.router, prefix="/admin", tags=["admin"])
