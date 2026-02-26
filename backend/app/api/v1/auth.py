"""
Auth endpoints — register, login, refresh, logout, me.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.core.config import settings
from app.core.database import get_db
from app.models.user import Plan, RefreshToken, User
from app.schemas.auth import (
    AccessTokenResponse,
    ChangePasswordRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserOut,
    UserRegistered,
)

router = APIRouter()


@router.post("/register", response_model=UserRegistered, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check duplicate
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    # Get free plan
    plan_result = await db.execute(select(Plan).where(Plan.name == "free"))
    plan = plan_result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=500, detail="Free plan not configured")

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        plan_id=plan.id,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    return UserRegistered(id=user.id, email=user.email, plan=plan.name)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).options(selectinload(User.plan)).where(User.email == body.email)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is disabled")

    # Create tokens - use extended expiration for "remember me"
    refresh_days = (
        settings.JWT_REMEMBER_ME_EXPIRE_DAYS
        if body.remember_me
        else settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
    )

    access_token = create_access_token(user.id, user.role)
    raw_refresh, token_hash = create_refresh_token()

    refresh = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=refresh_days),
    )
    db.add(refresh)

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    token_hash = hash_refresh_token(body.refresh_token)

    result = await db.execute(
        select(RefreshToken)
        .options(selectinload(RefreshToken.user))
        .where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False,  # noqa: E712
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
    )
    token = result.scalar_one_or_none()

    if not token:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    if not token.user.is_active:
        raise HTTPException(status_code=401, detail="Account is disabled")

    access_token = create_access_token(token.user.id, token.user.role)

    return AccessTokenResponse(
        access_token=access_token,
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", status_code=200)
async def logout(body: LogoutRequest, db: AsyncSession = Depends(get_db)):
    token_hash = hash_refresh_token(body.refresh_token)

    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    token = result.scalar_one_or_none()
    if token:
        token.revoked = True

    return {"detail": "Logged out"}


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
async def update_me(
    body: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.full_name is not None:
        user.full_name = body.full_name
    await db.flush()
    await db.refresh(user, ["plan"])
    return user


@router.post("/change-password", status_code=200)
async def change_password(
    body: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    user.hashed_password = hash_password(body.new_password)

    # Revoke all refresh tokens on password change
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user.id,
            RefreshToken.revoked == False,  # noqa: E712
        )
    )
    for token in result.scalars().all():
        token.revoked = True

    return {"detail": "Password changed successfully"}
