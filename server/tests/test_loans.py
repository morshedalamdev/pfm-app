from __future__ import annotations

import asyncio
from collections.abc import Iterator
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi import FastAPI
from fastapi.testclient import TestClient

from alembic import command
from app.core.config import Settings
from app.core.database import (
    build_async_engine,
    build_session_factory,
    get_session,
    get_session_from_factory,
)
from app.main import create_app


@dataclass(frozen=True)
class LoanApiContext:
    client: TestClient
    database_url: str


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def loan_test_app(database_url: str) -> FastAPI:
    return create_app(
        Settings(
            app_name="PFM Test API",
            app_env="test",
            debug=False,
            cors_origins=["http://testserver"],
            database_url=database_url,
            access_token_secret_key="loan-test-secret-with-at-least-32-bytes",
        ),
    )


@pytest.fixture
def loan_context(disposable_postgres_url: str) -> Iterator[LoanApiContext]:
    command.upgrade(build_alembic_config(disposable_postgres_url), "head")
    engine = build_async_engine(disposable_postgres_url)
    session_factory = build_session_factory(engine)
    app = loan_test_app(disposable_postgres_url)

    async def test_session() -> object:
        async for session in get_session_from_factory(session_factory):
            yield session

    app.dependency_overrides[get_session] = test_session

    try:
        with TestClient(app) as client:
            yield LoanApiContext(client=client, database_url=disposable_postgres_url)
    finally:
        asyncio.run(engine.dispose())


def test_loan_people_allow_duplicate_names_but_unique_user_phone(
    loan_context: LoanApiContext,
) -> None:
    context = loan_context
    owner_headers = auth_headers(context, "loan-people-owner@example.com")
    other_headers = auth_headers(context, "loan-people-other@example.com")

    first_person = create_person(
        context,
        owner_headers,
        name="Alex",
        phone_number="+8801711111111",
    )
    second_person = create_person(
        context,
        owner_headers,
        name="Alex",
        phone_number="+8801722222222",
    )
    assert first_person["name"] == second_person["name"]

    duplicate_response = context.client.post(
        "/api/v1/loans/people",
        headers=owner_headers,
        json={"name": "Different", "phone_number": "+8801711111111"},
    )
    assert duplicate_response.status_code == 409

    other_user_duplicate = create_person(
        context,
        other_headers,
        name="Same phone is allowed for another user",
        phone_number="+8801711111111",
    )
    assert other_user_duplicate["phone_number"] == "+8801711111111"

    update_duplicate_response = context.client.patch(
        f"/api/v1/loans/people/{second_person['id']}",
        headers=owner_headers,
        json={"phone_number": "+8801711111111"},
    )
    assert update_duplicate_response.status_code == 409

    archive_response = context.client.delete(
        f"/api/v1/loans/people/{first_person['id']}",
        headers=owner_headers,
    )
    assert archive_response.status_code == 200
    assert archive_response.json()["archived_at"] is not None

    default_list_response = context.client.get(
        "/api/v1/loans/people",
        headers=owner_headers,
    )
    assert default_list_response.status_code == 200
    assert first_person["id"] not in {
        item["id"] for item in default_list_response.json()["items"]
    }

    archived_list_response = context.client.get(
        "/api/v1/loans/people",
        headers=owner_headers,
        params={"include_archived": True},
    )
    assert archived_list_response.status_code == 200
    assert first_person["id"] in {
        item["id"] for item in archived_list_response.json()["items"]
    }

    archived_record_response = context.client.post(
        "/api/v1/loans/records",
        headers=owner_headers,
        json={
            "account_id": get_default_account_id(context, owner_headers),
            "person_id": first_person["id"],
            "direction": "given",
            "principal_amount": "10.0000",
            "issued_at": "2026-07-01T10:00:00+00:00",
            "repay_date": "2026-08-01",
        },
    )
    assert archived_record_response.status_code == 409


def test_loan_record_partial_settlement_and_summary_lifecycle(
    loan_context: LoanApiContext,
) -> None:
    context = loan_context
    headers = auth_headers(context, "loan-lifecycle@example.com")
    person = create_person(
        context,
        headers,
        name="Taylor",
        phone_number="+8801733333333",
    )
    given_record = create_record(
        context,
        headers,
        person_id=person["id"],
        direction="given",
        principal_amount="100.0000",
        issued_at="2026-07-01T10:00:00+00:00",
    )
    assert given_record["account_id"] == get_default_account_id(context, headers)
    assert given_record["repay_date"] == "2026-08-01"
    taken_record = create_record(
        context,
        headers,
        person_id=person["id"],
        direction="taken",
        principal_amount="40.0000",
        issued_at="2026-07-02T10:00:00+00:00",
    )
    assert taken_record["repay_date"] == "2026-08-01"

    summary = get_summary(context, headers)
    assert Decimal(summary["total_loan_given"]) == Decimal("100.0000")
    assert Decimal(summary["total_loan_taken"]) == Decimal("40.0000")
    assert Decimal(summary["due_loan"]) == Decimal("60.0000")

    first_settlement = create_settlement(
        context,
        headers,
        given_record["id"],
        amount="25.0000",
        settled_at="2026-07-03T10:00:00+00:00",
    )
    assert Decimal(first_settlement["amount"]) == Decimal("25.0000")

    detail_response = context.client.get(
        f"/api/v1/loans/records/{given_record['id']}",
        headers=headers,
    )
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["status"] == "open"
    assert Decimal(detail["settled_amount"]) == Decimal("25.0000")
    assert Decimal(detail["outstanding_amount"]) == Decimal("75.0000")

    over_settle_response = context.client.post(
        f"/api/v1/loans/records/{given_record['id']}/settlements",
        headers=headers,
        json={
            "account_id": get_default_account_id(context, headers),
            "amount": "80.0000",
            "settled_at": "2026-07-04T10:00:00+00:00",
        },
    )
    assert over_settle_response.status_code == 409

    final_settlement = create_settlement(
        context,
        headers,
        given_record["id"],
        amount="75.0000",
        settled_at="2026-07-05T10:00:00+00:00",
    )
    assert Decimal(final_settlement["amount"]) == Decimal("75.0000")

    settled_detail_response = context.client.get(
        f"/api/v1/loans/records/{given_record['id']}",
        headers=headers,
    )
    assert settled_detail_response.status_code == 200
    settled_detail = settled_detail_response.json()
    assert settled_detail["status"] == "settled"
    assert settled_detail["settled_at"] is not None
    assert Decimal(settled_detail["outstanding_amount"]) == Decimal("0.0000")

    settlement_list_response = context.client.get(
        f"/api/v1/loans/records/{given_record['id']}/settlements",
        headers=headers,
    )
    assert settlement_list_response.status_code == 200
    assert [
        Decimal(item["amount"]) for item in settlement_list_response.json()["items"]
    ] == [Decimal("75.0000"), Decimal("25.0000")]

    summary_after = get_summary(context, headers)
    assert Decimal(summary_after["total_loan_given"]) == Decimal("0.0000")
    assert Decimal(summary_after["total_loan_taken"]) == Decimal("40.0000")
    assert Decimal(summary_after["due_loan"]) == Decimal("-40.0000")

    update_taken_response = context.client.patch(
        f"/api/v1/loans/records/{taken_record['id']}",
        headers=headers,
        json={
            "principal_amount": "50.0000",
            "repay_date": "2026-09-01",
            "note": "Updated amount",
        },
    )
    assert update_taken_response.status_code == 200
    assert Decimal(update_taken_response.json()["outstanding_amount"]) == Decimal(
        "50.0000"
    )
    assert update_taken_response.json()["repay_date"] == "2026-09-01"

    settled_list_response = context.client.get(
        "/api/v1/loans/records",
        headers=headers,
        params={"status": "settled"},
    )
    assert settled_list_response.status_code == 200
    assert [item["id"] for item in settled_list_response.json()["items"]] == [
        given_record["id"]
    ]


def test_loan_validation_ownership_cursors_and_openapi(
    loan_context: LoanApiContext,
) -> None:
    context = loan_context
    owner_headers = auth_headers(context, "loan-owner@example.com")
    other_headers = auth_headers(context, "loan-other@example.com")
    owner_person = create_person(
        context,
        owner_headers,
        name="Owner person",
        phone_number="+8801744444444",
    )
    other_person = create_person(
        context,
        other_headers,
        name="Other person",
        phone_number="+8801755555555",
    )
    owner_account_id = get_default_account_id(context, owner_headers)
    other_account_id = get_default_account_id(context, other_headers)
    record = create_record(
        context,
        owner_headers,
        person_id=owner_person["id"],
        direction="given",
        principal_amount="25.0000",
        issued_at="2026-07-01T10:00:00+00:00",
    )

    assert (
        context.client.post(
            "/api/v1/loans/records",
            headers=owner_headers,
            json={
                "account_id": owner_account_id,
                "person_id": other_person["id"],
                "direction": "given",
                "principal_amount": "10.0000",
                "issued_at": "2026-07-01T10:00:00+00:00",
                "repay_date": "2026-08-01",
            },
        ).status_code
        == 404
    )
    assert (
        context.client.get(
            f"/api/v1/loans/records/{record['id']}",
            headers=other_headers,
        ).status_code
        == 404
    )
    assert (
        context.client.post(
            f"/api/v1/loans/records/{record['id']}/settlements",
            headers=other_headers,
            json={
                "account_id": other_account_id,
                "amount": "1.0000",
                "settled_at": "2026-07-02T10:00:00+00:00",
            },
        ).status_code
        == 404
    )
    assert (
        context.client.post(
            "/api/v1/loans/records",
            headers=owner_headers,
            json={
                "account_id": owner_account_id,
                "person_id": owner_person["id"],
                "direction": "taken",
                "principal_amount": 1.2,
                "issued_at": "2026-07-01T10:00:00+00:00",
                "repay_date": "2026-08-01",
            },
        ).status_code
        == 422
    )
    assert (
        context.client.post(
            "/api/v1/loans/records",
            headers=owner_headers,
            json={
                "account_id": owner_account_id,
                "person_id": owner_person["id"],
                "direction": "taken",
                "principal_amount": "10.0000",
                "issued_at": "2026-07-01T10:00:00",
                "repay_date": "2026-08-01",
            },
        ).status_code
        == 422
    )
    assert (
        context.client.post(
            "/api/v1/loans/records",
            headers=owner_headers,
            json={
                "account_id": owner_account_id,
                "person_id": owner_person["id"],
                "direction": "taken",
                "principal_amount": "10.0000",
                "issued_at": "2026-07-01T10:00:00+00:00",
            },
        ).status_code
        == 422
    )
    assert (
        context.client.post(
            "/api/v1/loans/records",
            headers=owner_headers,
            json={
                "account_id": owner_account_id,
                "person_id": owner_person["id"],
                "direction": "taken",
                "principal_amount": "10.0000",
                "issued_at": "2026-07-02T10:00:00+00:00",
                "repay_date": "2026-07-01",
            },
        ).status_code
        == 422
    )
    assert (
        context.client.post(
            "/api/v1/loans/records",
            headers=owner_headers,
            json={
                "account_id": other_account_id,
                "person_id": owner_person["id"],
                "direction": "taken",
                "principal_amount": "10.0000",
                "issued_at": "2026-07-01T10:00:00+00:00",
                "repay_date": "2026-08-01",
            },
        ).status_code
        == 404
    )
    assert (
        context.client.get(
            "/api/v1/loans/people",
            headers=owner_headers,
            params={"cursor": "not-a-valid-cursor"},
        ).status_code
        == 422
    )
    assert (
        context.client.get(
            "/api/v1/loans/records",
            headers=owner_headers,
            params={"cursor": "not-a-valid-cursor"},
        ).status_code
        == 422
    )
    assert (
        context.client.get(
            f"/api/v1/loans/records/{record['id']}/settlements",
            headers=owner_headers,
            params={"cursor": "not-a-valid-cursor"},
        ).status_code
        == 422
    )
    assert (
        context.client.get(
            "/api/v1/loans/records",
            headers=owner_headers,
            params={"person_id": "not-a-uuid"},
        ).status_code
        == 422
    )

    openapi = context.client.get("/openapi.json").json()
    assert "/api/v1/loans/people" in openapi["paths"]
    assert "/api/v1/loans/records" in openapi["paths"]
    assert "/api/v1/loans/records/{record_id}/settlements" in openapi["paths"]
    assert "/api/v1/loans/summary" in openapi["paths"]
    assert openapi["paths"]["/api/v1/loans/records"]["post"]["security"] == [
        {"HTTPBearer": []}
    ]
    invalid_update_response = context.client.patch(
        f"/api/v1/loans/records/{record['id']}",
        headers=owner_headers,
        json={"repay_date": "2026-06-30"},
    )
    assert invalid_update_response.status_code == 422


def test_loan_account_selection_excludes_inactive_but_preserves_history(
    loan_context: LoanApiContext,
) -> None:
    context = loan_context
    headers = auth_headers(context, "loan-account-selection@example.com")
    person = create_person(
        context,
        headers,
        name="Account person",
        phone_number="+8801766666666",
    )
    account = create_account(
        context,
        headers,
        name="Loan wallet",
    )
    record = create_record(
        context,
        headers,
        person_id=person["id"],
        account_id=account["id"],
        direction="given",
        principal_amount="20.0000",
        issued_at="2026-07-01T10:00:00+00:00",
    )
    assert record["account_id"] == account["id"]
    assert get_account_balance(context, headers, account["id"]) == Decimal("80.0000")

    disable_response = context.client.patch(
        f"/api/v1/accounts/{account['id']}/disable",
        headers=headers,
    )
    assert disable_response.status_code == 200

    create_with_disabled_response = context.client.post(
        "/api/v1/loans/records",
        headers=headers,
        json={
            "account_id": account["id"],
            "person_id": person["id"],
            "direction": "taken",
            "principal_amount": "5.0000",
            "issued_at": "2026-07-02T10:00:00+00:00",
            "repay_date": "2026-08-01",
        },
    )
    assert create_with_disabled_response.status_code == 409
    assert get_account_balance(context, headers, account["id"]) == Decimal("80.0000")

    historical_update_response = context.client.patch(
        f"/api/v1/loans/records/{record['id']}",
        headers=headers,
        json={"account_id": account["id"], "note": "Historical account retained"},
    )
    assert historical_update_response.status_code == 200
    assert historical_update_response.json()["account_id"] == account["id"]
    assert get_account_balance(context, headers, account["id"]) == Decimal("80.0000")


def test_loan_balance_effects_apply_once_and_follow_existing_edits(
    loan_context: LoanApiContext,
) -> None:
    context = loan_context
    headers = auth_headers(context, "loan-balance-effects@example.com")
    person = create_person(
        context,
        headers,
        name="Balance person",
        phone_number="+8801777777777",
    )
    primary = create_account(context, headers, name="Primary loan account")
    secondary = create_account(context, headers, name="Secondary loan account")

    given_record = create_record(
        context,
        headers,
        person_id=person["id"],
        account_id=primary["id"],
        direction="given",
        principal_amount="20.0000",
        issued_at="2026-07-01T10:00:00+00:00",
    )
    assert get_account_balance(context, headers, primary["id"]) == Decimal("80.0000")
    assert get_account_balance(context, headers, primary["id"]) == Decimal("80.0000")

    create_record(
        context,
        headers,
        person_id=person["id"],
        account_id=primary["id"],
        direction="taken",
        principal_amount="5.0000",
        issued_at="2026-07-02T10:00:00+00:00",
    )
    assert get_account_balance(context, headers, primary["id"]) == Decimal("85.0000")

    note_update = context.client.patch(
        f"/api/v1/loans/records/{given_record['id']}",
        headers=headers,
        json={"note": "No balance change"},
    )
    assert note_update.status_code == 200
    assert get_account_balance(context, headers, primary["id"]) == Decimal("85.0000")

    amount_update = context.client.patch(
        f"/api/v1/loans/records/{given_record['id']}",
        headers=headers,
        json={"principal_amount": "30.0000"},
    )
    assert amount_update.status_code == 200
    assert get_account_balance(context, headers, primary["id"]) == Decimal("75.0000")

    account_update = context.client.patch(
        f"/api/v1/loans/records/{given_record['id']}",
        headers=headers,
        json={"account_id": secondary["id"]},
    )
    assert account_update.status_code == 200
    assert get_account_balance(context, headers, primary["id"]) == Decimal("105.0000")
    assert get_account_balance(context, headers, secondary["id"]) == Decimal("70.0000")

    direction_update = context.client.patch(
        f"/api/v1/loans/records/{given_record['id']}",
        headers=headers,
        json={"direction": "taken"},
    )
    assert direction_update.status_code == 200
    assert get_account_balance(context, headers, secondary["id"]) == Decimal("130.0000")

    overdraw_account = create_account(context, headers, name="Overdraw account")
    create_record(
        context,
        headers,
        person_id=person["id"],
        account_id=overdraw_account["id"],
        direction="given",
        principal_amount="150.0000",
        issued_at="2026-07-03T10:00:00+00:00",
    )
    assert get_account_balance(context, headers, overdraw_account["id"]) == Decimal(
        "-50.0000"
    )


def test_loan_settlements_apply_to_the_selected_account(
    loan_context: LoanApiContext,
) -> None:
    context = loan_context
    headers = auth_headers(context, "loan-settlement-account@example.com")
    person = create_person(
        context,
        headers,
        name="Settlement person",
        phone_number="+8801788888888",
    )
    loan_account = create_account(context, headers, name="Loan source")
    settlement_account = create_account(context, headers, name="Settlement wallet")

    given_record = create_record(
        context,
        headers,
        person_id=person["id"],
        account_id=loan_account["id"],
        direction="given",
        principal_amount="20.0000",
        issued_at="2026-07-01T10:00:00+00:00",
    )
    assert get_account_balance(context, headers, loan_account["id"]) == Decimal(
        "80.0000"
    )
    given_settlement = create_settlement(
        context,
        headers,
        given_record["id"],
        account_id=settlement_account["id"],
        amount="7.0000",
        settled_at="2026-07-02T10:00:00+00:00",
    )
    assert given_settlement["account_id"] == settlement_account["id"]
    assert get_account_balance(context, headers, settlement_account["id"]) == Decimal(
        "107.0000"
    )

    taken_record = create_record(
        context,
        headers,
        person_id=person["id"],
        account_id=loan_account["id"],
        direction="taken",
        principal_amount="10.0000",
        issued_at="2026-07-03T10:00:00+00:00",
    )
    assert get_account_balance(context, headers, loan_account["id"]) == Decimal(
        "90.0000"
    )
    taken_settlement = create_settlement(
        context,
        headers,
        taken_record["id"],
        account_id=settlement_account["id"],
        amount="4.0000",
        settled_at="2026-07-04T10:00:00+00:00",
    )
    assert taken_settlement["account_id"] == settlement_account["id"]
    assert get_account_balance(context, headers, settlement_account["id"]) == Decimal(
        "103.0000"
    )


def auth_headers(context: LoanApiContext, email: str) -> dict[str, str]:
    register_response = context.client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "CorrectHorse42"},
    )
    assert register_response.status_code == 201

    login_response = context.client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "CorrectHorse42"},
    )
    assert login_response.status_code == 200
    return {"Authorization": f"Bearer {login_response.json()['access_token']}"}


def create_person(
    context: LoanApiContext,
    headers: dict[str, str],
    *,
    name: str,
    phone_number: str,
    note: str | None = None,
) -> dict[str, object]:
    payload: dict[str, object] = {"name": name, "phone_number": phone_number}
    if note is not None:
        payload["note"] = note
    response = context.client.post(
        "/api/v1/loans/people",
        headers=headers,
        json=payload,
    )
    assert response.status_code == 201
    return dict(response.json())


def create_record(
    context: LoanApiContext,
    headers: dict[str, str],
    *,
    person_id: object,
    account_id: object | None = None,
    direction: str,
    principal_amount: str,
    issued_at: str,
    repay_date: str = "2026-08-01",
) -> dict[str, object]:
    response = context.client.post(
        "/api/v1/loans/records",
        headers=headers,
        json={
            "account_id": account_id or get_default_account_id(context, headers),
            "person_id": person_id,
            "direction": direction,
            "principal_amount": principal_amount,
            "issued_at": issued_at,
            "repay_date": repay_date,
        },
    )
    assert response.status_code == 201
    return dict(response.json())


def create_account(
    context: LoanApiContext,
    headers: dict[str, str],
    *,
    name: str,
) -> dict[str, object]:
    response = context.client.post(
        "/api/v1/accounts",
        headers=headers,
        json={
            "name": name,
            "type": "cash",
            "currency": "USD",
            "opening_balance": "100.0000",
        },
    )
    assert response.status_code == 201
    return dict(response.json())


def get_default_account_id(
    context: LoanApiContext,
    headers: dict[str, str],
) -> object:
    response = context.client.get("/api/v1/accounts", headers=headers)
    assert response.status_code == 200
    default_account = next(
        account for account in response.json()["items"] if account["is_default"]
    )
    return default_account["id"]


def get_account_balance(
    context: LoanApiContext,
    headers: dict[str, str],
    account_id: object,
) -> Decimal:
    response = context.client.get(
        f"/api/v1/accounts/{account_id}",
        headers=headers,
    )
    assert response.status_code == 200
    return Decimal(response.json()["current_balance"])


def create_settlement(
    context: LoanApiContext,
    headers: dict[str, str],
    record_id: object,
    *,
    account_id: object | None = None,
    amount: str,
    settled_at: str,
) -> dict[str, object]:
    response = context.client.post(
        f"/api/v1/loans/records/{record_id}/settlements",
        headers=headers,
        json={
            "account_id": account_id or get_default_account_id(context, headers),
            "amount": amount,
            "settled_at": settled_at,
        },
    )
    assert response.status_code == 201
    return dict(response.json())


def get_summary(
    context: LoanApiContext,
    headers: dict[str, str],
) -> dict[str, object]:
    response = context.client.get("/api/v1/loans/summary", headers=headers)
    assert response.status_code == 200
    return dict(response.json())
