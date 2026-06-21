from __future__ import annotations

from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

import pytest
from pydantic import ValidationError

from app.modules.reports.schemas import (
    CashFlowBucketResponse,
    CashFlowReportResponse,
    DashboardReportQuery,
    DashboardReportResponse,
    MonthlyReportQuery,
    MonthlySummaryReportResponse,
    ReportDateRangeQuery,
    ReportRangeResponse,
    SpendingByCategoryReportResponse,
)


def test_report_query_contracts_validate_enums_and_months() -> None:
    assert DashboardReportQuery(period="week", type="expense").as_of is None
    assert MonthlyReportQuery(month="2026-01").month == "2026-01"

    with pytest.raises(ValidationError):
        DashboardReportQuery(period="quarter", type="expense")  # type: ignore[arg-type]

    with pytest.raises(ValidationError):
        MonthlyReportQuery(month="2026-13")


def test_report_date_range_query_normalizes_utc_and_rejects_invalid_ranges() -> None:
    query = ReportDateRangeQuery(
        date_from=datetime(2026, 1, 1, 6, 0, tzinfo=timezone(timedelta(hours=6))),
        date_to=datetime(2026, 2, 1, 0, 0, tzinfo=UTC),
        interval="day",
    )

    assert query.date_from == datetime(2026, 1, 1, 0, 0, tzinfo=UTC)

    with pytest.raises(ValidationError):
        ReportDateRangeQuery(
            date_from=datetime(2026, 1, 1, 0, 0),
            date_to=datetime(2026, 2, 1, 0, 0, tzinfo=UTC),
            interval="day",
        )

    with pytest.raises(ValidationError):
        ReportDateRangeQuery(
            date_from=datetime(2026, 2, 1, 0, 0, tzinfo=UTC),
            date_to=datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
            interval="day",
        )


def test_report_response_money_contracts_are_decimal_strings() -> None:
    for schema, field_names in [
        (
            DashboardReportResponse.model_json_schema(),
            [
                "available_balance",
                "income_amount",
                "expense_amount",
                "net_flow_amount",
            ],
        ),
        (
            MonthlySummaryReportResponse.model_json_schema(),
            [
                "savings_amount",
                "savings_month_over_month_percent",
                "income_amount",
                "expense_amount",
                "net_flow_amount",
                "budget_used_percent",
            ],
        ),
        (
            SpendingByCategoryReportResponse.model_json_schema(),
            ["total_amount"],
        ),
    ]:
        for field_name in field_names:
            assert_decimal_string_schema(schema, schema["properties"][field_name])


def test_cash_flow_response_serializes_empty_buckets_as_decimal_strings() -> None:
    response = CashFlowReportResponse(
        range=ReportRangeResponse(
            start_at=datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
            end_at=datetime(2026, 1, 2, 0, 0, tzinfo=UTC),
        ),
        interval="day",
        currency="USD",
        buckets=[
            CashFlowBucketResponse(
                label="Jan 1",
                start_at=datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
                end_at=datetime(2026, 1, 2, 0, 0, tzinfo=UTC),
                income_amount=Decimal("0.0000"),
                expense_amount=Decimal("0.0000"),
                net_flow_amount=Decimal("0.0000"),
            )
        ],
    )

    payload = response.model_dump(mode="json")

    assert payload["buckets"] == [
        {
            "label": "Jan 1",
            "start_at": "2026-01-01T00:00:00Z",
            "end_at": "2026-01-02T00:00:00Z",
            "income_amount": "0.0000",
            "expense_amount": "0.0000",
            "net_flow_amount": "0.0000",
        }
    ]


def assert_decimal_string_schema(
    root_schema: dict[str, Any], field_schema: dict[str, Any]
) -> None:
    field_schema = resolve_ref(root_schema, field_schema)
    if "anyOf" in field_schema:
        variants = [
            resolve_ref(root_schema, variant) for variant in field_schema["anyOf"]
        ]
        assert any(variant.get("type") == "string" for variant in variants)
        assert all(variant.get("type") != "number" for variant in variants)
        return

    assert field_schema["type"] == "string"
    assert "pattern" in field_schema


def resolve_ref(
    root_schema: dict[str, Any], field_schema: dict[str, Any]
) -> dict[str, Any]:
    ref = field_schema.get("$ref")
    if not isinstance(ref, str):
        return field_schema
    definition_name = ref.removeprefix("#/$defs/")
    resolved = root_schema["$defs"][definition_name]
    assert isinstance(resolved, dict)
    return resolved
