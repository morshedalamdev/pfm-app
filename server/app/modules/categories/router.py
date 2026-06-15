import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.modules.auth.dependencies import CurrentUserDependency
from app.modules.categories.repositories import CategoryRepository
from app.modules.categories.schemas import (
    CategoryCreateRequest,
    CategoryKind,
    CategoryListResponse,
    CategoryResponse,
    CategoryUpdateRequest,
)
from app.modules.categories.services import (
    CategoryNotFoundError,
    CategoryService,
    DuplicateCategoryError,
    InvalidCategoryCursorError,
)

router = APIRouter(prefix="/categories", tags=["categories"])
SessionDependency = Annotated[AsyncSession, Depends(get_session)]


def build_category_service(session: AsyncSession) -> CategoryService:
    return CategoryService(categories=CategoryRepository(session))


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_category(
    request: CategoryCreateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> CategoryResponse:
    try:
        category = await build_category_service(session).create_category(
            request,
            current_user,
        )
    except DuplicateCategoryError as exc:
        raise duplicate_category_error() from exc
    return CategoryResponse.model_validate(category)


@router.get("", response_model=CategoryListResponse)
async def list_categories(
    current_user: CurrentUserDependency,
    session: SessionDependency,
    kind: CategoryKind | None = None,
    include_archived: bool = False,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> CategoryListResponse:
    try:
        return await build_category_service(session).list_categories(
            current_user,
            kind=kind,
            include_archived=include_archived,
            cursor=cursor,
            limit=limit,
        )
    except InvalidCategoryCursorError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid pagination cursor",
        ) from exc


@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    request: CategoryUpdateRequest,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> CategoryResponse:
    try:
        category = await build_category_service(session).update_category(
            parse_uuid_or_404(category_id),
            request,
            current_user,
        )
    except CategoryNotFoundError as exc:
        raise not_found_error("Category not found") from exc
    except DuplicateCategoryError as exc:
        raise duplicate_category_error() from exc
    return CategoryResponse.model_validate(category)


@router.delete("/{category_id}", response_model=CategoryResponse)
async def archive_category(
    category_id: str,
    current_user: CurrentUserDependency,
    session: SessionDependency,
) -> CategoryResponse:
    try:
        category = await build_category_service(session).archive_category(
            parse_uuid_or_404(category_id),
            current_user,
        )
    except CategoryNotFoundError as exc:
        raise not_found_error("Category not found") from exc
    return CategoryResponse.model_validate(category)


def parse_uuid_or_404(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise not_found_error("Category not found") from exc


def not_found_error(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)


def duplicate_category_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Category already exists",
    )
