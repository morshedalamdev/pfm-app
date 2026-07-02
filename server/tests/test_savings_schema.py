from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import CheckConstraint, ForeignKeyConstraint, Index, Numeric

from app.core.database import Base
from app.modules.savings.models import SavingsContribution, SavingsGoal


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


def test_savings_goal_model_schema() -> None:
    table = SavingsGoal.__table__

    assert table.metadata is Base.metadata
    assert set(table.columns.keys()) == {
        "id",
        "user_id",
        "name",
        "target_amount",
        "monthly_target_amount",
        "currency",
        "target_date",
        "status",
        "note",
        "completed_at",
        "archived_at",
        "created_at",
        "updated_at",
    }
    assert table.columns.name.type.length == 120
    assert table.columns.currency.type.length == 3
    assert table.columns.status.type.length == 20
    assert table.columns.target_date.nullable is True
    assert_numeric_money(table.columns.target_amount.type)
    assert_numeric_money(table.columns.monthly_target_amount.type)
    assert {
        "ck_savings_goals_status_supported",
        "ck_savings_goals_target_amount_positive",
        "ck_savings_goals_monthly_target_amount_non_negative",
        "ck_savings_goals_archive_state_consistent",
        "ck_savings_goals_completion_state_consistent",
    }.issubset(
        check_constraint_names(
            [
                constraint
                for constraint in table.constraints
                if isinstance(constraint, CheckConstraint)
            ]
        )
    )
    assert {"fk_savings_goals_user_id_users"}.issubset(
        foreign_key_names(
            [
                constraint
                for constraint in table.constraints
                if isinstance(constraint, ForeignKeyConstraint)
            ]
        )
    )
    assert index_names(table.indexes) == {
        "ix_savings_goals_user_id",
        "ix_savings_goals_user_id_status",
        "ix_savings_goals_user_id_archived_at",
        "ix_savings_goals_user_id_created_at",
    }


def test_savings_contribution_model_schema() -> None:
    table = SavingsContribution.__table__

    assert table.metadata is Base.metadata
    assert set(table.columns.keys()) == {
        "id",
        "user_id",
        "goal_id",
        "amount",
        "currency",
        "contributed_at",
        "note",
        "created_at",
    }
    assert table.columns.currency.type.length == 3
    assert table.columns.contributed_at.type.timezone is True
    assert_numeric_money(table.columns.amount.type)
    assert {"ck_savings_contributions_amount_positive"}.issubset(
        check_constraint_names(
            [
                constraint
                for constraint in table.constraints
                if isinstance(constraint, CheckConstraint)
            ]
        )
    )
    assert {
        "fk_savings_contributions_user_id_users",
        "fk_savings_contributions_goal_id_user_id_savings_goals",
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
        "ix_savings_contributions_user_id_created_at",
        "ix_savings_contributions_user_id_goal_id_contributed_at",
        "ix_savings_contributions_reports_user_contributed_at",
    }
