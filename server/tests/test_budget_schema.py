from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import CheckConstraint, ForeignKeyConstraint, Index, Numeric
from sqlalchemy.dialects.postgresql import ExcludeConstraint

from app.core.database import Base
from app.modules.budgets.models import Budget


def check_constraint_names(constraints: Sequence[CheckConstraint]) -> set[str | None]:
    return {constraint.name for constraint in constraints}


def foreign_key_names(constraints: Sequence[ForeignKeyConstraint]) -> set[str | None]:
    return {constraint.name for constraint in constraints}


def index_names(indexes: set[Index]) -> set[str]:
    return {index.name for index in indexes if index.name is not None}


def assert_numeric_money(column_type: object) -> None:
    assert isinstance(column_type, Numeric)
    assert column_type.precision == 18
    assert column_type.scale == 4


def test_budget_model_schema() -> None:
    table = Budget.__table__

    assert table.metadata is Base.metadata
    assert set(table.columns.keys()) == {
        "id",
        "user_id",
        "category_id",
        "period_type",
        "period_start",
        "period_end",
        "limit_amount",
        "currency",
        "is_archived",
        "archived_at",
        "created_at",
        "updated_at",
    }
    assert table.columns.category_id.nullable is True
    assert table.columns.period_type.type.length == 20
    assert table.columns.period_start.type.python_type.__name__ == "date"
    assert table.columns.period_end.type.python_type.__name__ == "date"
    assert table.columns.currency.type.length == 3
    assert_numeric_money(table.columns.limit_amount.type)
    assert {
        "ck_budgets_period_type_supported",
        "ck_budgets_period_dates_ordered",
        "ck_budgets_limit_amount_positive",
        "ck_budgets_monthly_period_matches_calendar_month",
        "ck_budgets_archive_state_consistent",
    }.issubset(
        check_constraint_names(
            [
                constraint
                for constraint in table.constraints
                if isinstance(constraint, CheckConstraint)
            ]
        )
    )
    assert {
        "fk_budgets_user_id_users",
        "fk_budgets_category_id_user_id_categories",
    }.issubset(
        foreign_key_names(
            [
                constraint
                for constraint in table.constraints
                if isinstance(constraint, ForeignKeyConstraint)
            ]
        )
    )
    assert index_names(table.indexes) == {
        "ix_budgets_user_id",
        "ix_budgets_user_id_category_id",
        "ix_budgets_user_id_period_start",
        "ix_budgets_user_id_archived_at",
        "ix_budgets_reports_active_user_period",
    }


def test_budget_overlap_rule_is_database_enforced() -> None:
    table = Budget.__table__

    exclusion_constraints = [
        constraint
        for constraint in table.constraints
        if isinstance(constraint, ExcludeConstraint)
    ]

    assert len(exclusion_constraints) == 1
    exclusion = exclusion_constraints[0]
    assert exclusion.name == "ex_budgets_active_scope_period_no_overlap"
    assert exclusion.using == "gist"
    assert str(exclusion.where) == "is_archived = false"
