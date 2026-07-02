from __future__ import annotations

import uuid
from collections.abc import Iterable
from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

from app.modules.accounts.models import Account
from app.modules.accounts.repositories import AccountRepository
from app.modules.categories.models import Category
from app.modules.categories.repositories import CategoryRepository

CategoryKind = Literal["income", "expense"]


@dataclass(frozen=True)
class DefaultAccount:
    currency: str
    name: str
    opening_balance: Decimal
    type: str


@dataclass(frozen=True)
class DefaultCategory:
    icon_key: str
    name: str


DEFAULT_ACCOUNT = DefaultAccount(
    currency="USD",
    name="Cash",
    opening_balance=Decimal("0"),
    type="cash",
)

DEFAULT_CATEGORIES: dict[CategoryKind, tuple[DefaultCategory, ...]] = {
    "income": (
        DefaultCategory(icon_key="briefcase", name="Salary"),
        DefaultCategory(icon_key="building", name="Business"),
        DefaultCategory(icon_key="laptop", name="Freelance"),
        DefaultCategory(icon_key="trending-up", name="Investments"),
        DefaultCategory(icon_key="more-horizontal", name="Other"),
    ),
    "expense": (
        DefaultCategory(icon_key="shopping-cart", name="Groceries"),
        DefaultCategory(icon_key="utensils", name="Dining"),
        DefaultCategory(icon_key="car", name="Transport"),
        DefaultCategory(icon_key="home", name="Housing"),
        DefaultCategory(icon_key="zap", name="Utilities"),
        DefaultCategory(icon_key="film", name="Entertainment"),
        DefaultCategory(icon_key="heart", name="Health"),
        DefaultCategory(icon_key="shopping-bag", name="Shopping"),
        DefaultCategory(icon_key="credit-card", name="Bills & Fees"),
        DefaultCategory(icon_key="more-horizontal", name="Other"),
    ),
}


async def ensure_default_account(
    accounts: AccountRepository,
    user_id: uuid.UUID,
) -> bool:
    if await accounts.has_any_owned(user_id):
        return False

    await accounts.create(
        Account(
            user_id=user_id,
            currency=DEFAULT_ACCOUNT.currency,
            name=DEFAULT_ACCOUNT.name,
            opening_balance=DEFAULT_ACCOUNT.opening_balance,
            type=DEFAULT_ACCOUNT.type,
        )
    )
    return True


async def ensure_default_categories(
    categories: CategoryRepository,
    user_id: uuid.UUID,
    *,
    kind: CategoryKind | None = None,
) -> bool:
    created = False
    for category_kind in default_category_kinds(kind):
        if await categories.has_any_owned_kind(user_id, category_kind):
            continue
        for default_category in DEFAULT_CATEGORIES[category_kind]:
            await categories.create(
                Category(
                    user_id=user_id,
                    icon_key=default_category.icon_key,
                    is_default=True,
                    kind=category_kind,
                    name=default_category.name,
                )
            )
            created = True
    return created


def default_category_kinds(kind: CategoryKind | None) -> Iterable[CategoryKind]:
    if kind is not None:
        return (kind,)
    return ("income", "expense")
