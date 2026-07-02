from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError

from app.modules.accounts.pagination import (
    InvalidCursorError,
    decode_cursor,
    encode_cursor,
)
from app.modules.categories.models import Category
from app.modules.categories.repositories import CategoryRepository
from app.modules.categories.schemas import (
    CategoryCreateRequest,
    CategoryListResponse,
    CategoryResponse,
    CategoryUpdateRequest,
)
from app.modules.users.models import User


class CategoryNotFoundError(Exception):
    pass


class DuplicateCategoryError(Exception):
    pass


class InvalidCategoryCursorError(Exception):
    pass


class CategoryService:
    def __init__(self, categories: CategoryRepository) -> None:
        self.categories = categories

    async def create_category(
        self,
        request: CategoryCreateRequest,
        current_user: User,
    ) -> Category:
        category = Category(
            user_id=current_user.id,
            name=request.name,
            kind=request.kind,
            icon_key=request.icon_key,
        )
        try:
            await self.categories.create(category)
            await self.categories.commit()
            await self.categories.refresh(category)
        except IntegrityError as exc:
            await self.categories.rollback()
            raise DuplicateCategoryError from exc
        return category

    async def list_categories(
        self,
        current_user: User,
        *,
        kind: str | None,
        include_archived: bool,
        cursor: str | None,
        limit: int,
    ) -> CategoryListResponse:
        try:
            page_cursor = decode_cursor(cursor)
        except InvalidCursorError as exc:
            raise InvalidCategoryCursorError from exc

        categories = await self.categories.list_owned(
            current_user.id,
            kind=kind,
            include_archived=include_archived,
            cursor=page_cursor,
            limit=limit + 1,
        )
        has_more = len(categories) > limit
        visible_categories = categories[:limit]
        next_cursor = (
            encode_cursor(visible_categories[-1].created_at, visible_categories[-1].id)
            if has_more and visible_categories
            else None
        )
        return CategoryListResponse(
            items=[
                CategoryResponse.model_validate(category)
                for category in visible_categories
            ],
            next_cursor=next_cursor,
            has_more=has_more,
        )

    async def get_category(
        self, category_id: uuid.UUID, current_user: User
    ) -> Category:
        category = await self.categories.get_owned(category_id, current_user.id)
        if category is None:
            raise CategoryNotFoundError
        return category

    async def update_category(
        self,
        category_id: uuid.UUID,
        request: CategoryUpdateRequest,
        current_user: User,
    ) -> Category:
        category = await self.get_category(category_id, current_user)
        update_data = request.model_dump(exclude_unset=True)
        for field_name, value in update_data.items():
            setattr(category, field_name, value)
        try:
            await self.categories.commit()
            await self.categories.refresh(category)
        except IntegrityError as exc:
            await self.categories.rollback()
            raise DuplicateCategoryError from exc
        return category

    async def archive_category(
        self,
        category_id: uuid.UUID,
        current_user: User,
    ) -> Category:
        category = await self.get_category(category_id, current_user)
        if category.archived_at is None:
            category.archived_at = datetime.now(UTC)
            category.is_archived = True
            await self.categories.commit()
            await self.categories.refresh(category)
        return category
