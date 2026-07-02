from __future__ import annotations

from typing import Any

from app.main import create_app


def test_finance_openapi_money_fields_are_decimal_strings() -> None:
    schemas = create_app().openapi()["components"]["schemas"]

    for schema_name, field_name in [
        ("AccountCreateRequest", "opening_balance"),
        ("AccountUpdateRequest", "opening_balance"),
        ("AccountResponse", "opening_balance"),
        ("TransactionCreateRequest", "amount"),
        ("TransactionUpdateRequest", "amount"),
        ("TransactionResponse", "amount"),
        ("TransferCreateRequest", "amount"),
        ("TransferResponse", "amount"),
    ]:
        assert_decimal_string_schema(schemas[schema_name]["properties"][field_name])


def test_finance_openapi_transaction_list_contract() -> None:
    schema = create_app().openapi()
    list_schema = schema["components"]["schemas"]["TransactionListResponse"]

    assert set(list_schema["properties"]) == {"items", "next_cursor", "has_more"}
    assert list_schema["properties"]["items"]["items"] == {
        "$ref": "#/components/schemas/TransactionResponse"
    }
    assert list_schema["properties"]["has_more"]["type"] == "boolean"

    parameters = {
        parameter["name"]: parameter
        for parameter in schema["paths"]["/api/v1/transactions"]["get"]["parameters"]
    }
    assert set(parameters) == {
        "account_id",
        "category_id",
        "cursor",
        "date_from",
        "date_to",
        "limit",
        "search",
        "type",
    }
    assert parameters["limit"]["schema"]["minimum"] == 1
    assert parameters["limit"]["schema"]["maximum"] == 100
    assert parameters["type"]["schema"]["anyOf"][0]["enum"] == [
        "income",
        "expense",
        "transfer_debit",
        "transfer_credit",
    ]


def test_finance_openapi_idempotency_headers_on_retryable_creates() -> None:
    schema = create_app().openapi()

    for path in ["/api/v1/transactions", "/api/v1/transactions/transfers"]:
        post_operation = schema["paths"][path]["post"]
        headers = {
            parameter["name"]: parameter
            for parameter in post_operation.get("parameters", [])
            if parameter["in"] == "header"
        }
        idempotency_key = headers["Idempotency-Key"]
        assert idempotency_key["required"] is False
        assert idempotency_key["schema"]["anyOf"][0]["type"] == "string"
        assert idempotency_key["schema"]["anyOf"][0]["minLength"] == 1
        assert idempotency_key["schema"]["anyOf"][0]["maxLength"] == 255


def assert_decimal_string_schema(field_schema: dict[str, Any]) -> None:
    if "anyOf" in field_schema:
        variants = field_schema["anyOf"]
        assert any(variant.get("type") == "string" for variant in variants)
        assert all(variant.get("type") != "number" for variant in variants)
        return

    assert field_schema["type"] == "string"
    assert "pattern" in field_schema
