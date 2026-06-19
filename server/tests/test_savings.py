from __future__ import annotations

import asyncio
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import date, timedelta
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
class SavingsApiContext:
    client: TestClient
    database_url: str


def build_alembic_config(database_url: str) -> Config:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def savings_test_app(database_url: str) -> FastAPI:
    return create_app(
        Settings(
            app_name="PFM Test API",
            app_env="test",
            debug=False,
            cors_origins=["http://testserver"],
            database_url=database_url,
            access_token_secret_key="savings-test-secret-with-at-least-32-bytes",
        ),
    )


@pytest.fixture
def savings_context(disposable_postgres_url: str) -> Iterator[SavingsApiContext]:
    command.upgrade(build_alembic_config(disposable_postgres_url), "head")
    engine = build_async_engine(disposable_postgres_url)
    session_factory = build_session_factory(engine)
    app = savings_test_app(disposable_postgres_url)

    async def test_session() -> object:
        async for session in get_session_from_factory(session_factory):
            yield session

    app.dependency_overrides[get_session] = test_session

    try:
        with TestClient(app) as client:
            yield SavingsApiContext(
                client=client,
                database_url=disposable_postgres_url,
            )
    finally:
        asyncio.run(engine.dispose())


def test_savings_goal_crud_progress_completion_and_archive(
    savings_context: SavingsApiContext,
) -> None:
    context = savings_context
    headers = auth_headers(context, "savings-progress@example.com")
    goal = create_savings_goal(
        context,
        headers,
        name="Emergency fund",
        target_amount="100.0000",
        monthly_target_amount="25.0000",
        target_date=(date.today() + timedelta(days=60)).isoformat(),
        note="Keep this funded",
    )
    assert goal["name"] == "Emergency fund"
    assert goal["status"] == "active"
    assert Decimal(goal["progress"]["saved_amount"]) == Decimal("0")

    update_response = context.client.patch(
        f"/api/v1/savings-goals/{goal['id']}",
        headers=headers,
        json={"name": "Emergency reserve", "monthly_target_amount": "30.0000"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Emergency reserve"

    first_contribution = create_contribution(
        context,
        headers,
        goal["id"],
        amount="40.0000",
        contributed_at="2026-07-01T10:00:00+00:00",
        note="Initial transfer",
    )
    assert Decimal(first_contribution["amount"]) == Decimal("40.0000")
    assert first_contribution["currency"] == "USD"

    detail_response = context.client.get(
        f"/api/v1/savings-goals/{goal['id']}",
        headers=headers,
    )
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert Decimal(detail["progress"]["saved_amount"]) == Decimal("40.0000")
    assert Decimal(detail["progress"]["remaining_amount"]) == Decimal("60.0000")
    assert Decimal(detail["progress"]["percent_complete"]) == Decimal("40")
    assert detail["progress"]["is_target_met"] is False

    final_contribution = create_contribution(
        context,
        headers,
        goal["id"],
        amount="65.0000",
        contributed_at="2026-07-02T10:00:00+00:00",
    )
    assert Decimal(final_contribution["amount"]) == Decimal("65.0000")

    completed_response = context.client.get(
        f"/api/v1/savings-goals/{goal['id']}",
        headers=headers,
    )
    assert completed_response.status_code == 200
    completed = completed_response.json()
    assert completed["status"] == "completed"
    assert completed["completed_at"] is not None
    assert Decimal(completed["progress"]["saved_amount"]) == Decimal("105.0000")
    assert Decimal(completed["progress"]["remaining_amount"]) == Decimal("-5.0000")
    assert Decimal(completed["progress"]["percent_complete"]) == Decimal("105")
    assert completed["progress"]["is_target_met"] is True

    extra_contribution_response = context.client.post(
        f"/api/v1/savings-goals/{goal['id']}/contributions",
        headers=headers,
        json={"amount": "1.0000", "contributed_at": "2026-07-03T10:00:00+00:00"},
    )
    assert extra_contribution_response.status_code == 409

    contributions_response = context.client.get(
        f"/api/v1/savings-goals/{goal['id']}/contributions",
        headers=headers,
    )
    assert contributions_response.status_code == 200
    contribution_items = contributions_response.json()["items"]
    assert [Decimal(item["amount"]) for item in contribution_items] == [
        Decimal("65.0000"),
        Decimal("40.0000"),
    ]

    completed_list_response = context.client.get(
        "/api/v1/savings-goals",
        headers=headers,
        params={"status": "completed"},
    )
    assert completed_list_response.status_code == 200
    assert [item["id"] for item in completed_list_response.json()["items"]] == [
        goal["id"]
    ]

    archive_response = context.client.delete(
        f"/api/v1/savings-goals/{goal['id']}",
        headers=headers,
    )
    assert archive_response.status_code == 200
    archived = archive_response.json()
    assert archived["status"] == "archived"
    assert archived["archived_at"] is not None

    default_list_response = context.client.get("/api/v1/savings-goals", headers=headers)
    assert default_list_response.status_code == 200
    assert goal["id"] not in {
        item["id"] for item in default_list_response.json()["items"]
    }

    archived_contribution_response = context.client.post(
        f"/api/v1/savings-goals/{goal['id']}/contributions",
        headers=headers,
        json={"amount": "1.0000", "contributed_at": "2026-07-04T10:00:00+00:00"},
    )
    assert archived_contribution_response.status_code == 409


def test_savings_validation_ownership_and_openapi(
    savings_context: SavingsApiContext,
) -> None:
    context = savings_context
    owner_headers = auth_headers(context, "savings-owner@example.com")
    other_headers = auth_headers(context, "savings-other@example.com")
    target_date = (date.today() + timedelta(days=30)).isoformat()
    past_date = (date.today() - timedelta(days=1)).isoformat()

    goal = create_savings_goal(
        context,
        owner_headers,
        name="Vacation",
        target_amount="500.0000",
        monthly_target_amount="100.0000",
        target_date=target_date,
    )

    assert (
        context.client.post(
            "/api/v1/savings-goals",
            headers=owner_headers,
            json={
                "name": "Bad date",
                "target_amount": "10.0000",
                "target_date": past_date,
            },
        ).status_code
        == 422
    )
    assert (
        context.client.post(
            "/api/v1/savings-goals",
            headers=owner_headers,
            json={"name": "Float", "target_amount": 1.2},
        ).status_code
        == 422
    )
    assert (
        context.client.post(
            "/api/v1/savings-goals",
            headers=owner_headers,
            json={"name": "Negative", "target_amount": "-1.0000"},
        ).status_code
        == 422
    )
    assert (
        context.client.post(
            f"/api/v1/savings-goals/{goal['id']}/contributions",
            headers=owner_headers,
            json={"amount": "-1.0000", "contributed_at": "2026-08-01T10:00:00+00:00"},
        ).status_code
        == 422
    )
    assert (
        context.client.post(
            f"/api/v1/savings-goals/{goal['id']}/contributions",
            headers=owner_headers,
            json={"amount": 1.2, "contributed_at": "2026-08-01T10:00:00+00:00"},
        ).status_code
        == 422
    )
    assert (
        context.client.post(
            f"/api/v1/savings-goals/{goal['id']}/contributions",
            headers=owner_headers,
            json={"amount": "1.0000", "contributed_at": "2026-08-01T10:00:00"},
        ).status_code
        == 422
    )

    assert (
        context.client.get(
            f"/api/v1/savings-goals/{goal['id']}",
            headers=other_headers,
        ).status_code
        == 404
    )
    assert (
        context.client.patch(
            f"/api/v1/savings-goals/{goal['id']}",
            headers=other_headers,
            json={"name": "Not mine"},
        ).status_code
        == 404
    )
    assert (
        context.client.delete(
            f"/api/v1/savings-goals/{goal['id']}",
            headers=other_headers,
        ).status_code
        == 404
    )
    assert (
        context.client.post(
            f"/api/v1/savings-goals/{goal['id']}/contributions",
            headers=other_headers,
            json={"amount": "1.0000", "contributed_at": "2026-08-01T10:00:00+00:00"},
        ).status_code
        == 404
    )
    assert (
        context.client.get(
            f"/api/v1/savings-goals/{goal['id']}/contributions",
            headers=other_headers,
        ).status_code
        == 404
    )

    openapi = context.client.get("/openapi.json").json()
    assert "/api/v1/savings-goals" in openapi["paths"]
    assert "/api/v1/savings-goals/{goal_id}" in openapi["paths"]
    assert "/api/v1/savings-goals/{goal_id}/contributions" in openapi["paths"]
    assert openapi["paths"]["/api/v1/savings-goals"]["post"]["security"] == [
        {"HTTPBearer": []}
    ]


def auth_headers(context: SavingsApiContext, email: str) -> dict[str, str]:
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


def create_savings_goal(
    context: SavingsApiContext,
    headers: dict[str, str],
    *,
    name: str,
    target_amount: str,
    monthly_target_amount: str = "0",
    target_date: str | None = None,
    note: str | None = None,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "name": name,
        "target_amount": target_amount,
        "monthly_target_amount": monthly_target_amount,
    }
    if target_date is not None:
        payload["target_date"] = target_date
    if note is not None:
        payload["note"] = note
    response = context.client.post(
        "/api/v1/savings-goals",
        headers=headers,
        json=payload,
    )
    assert response.status_code == 201
    return dict(response.json())


def create_contribution(
    context: SavingsApiContext,
    headers: dict[str, str],
    goal_id: object,
    *,
    amount: str,
    contributed_at: str,
    note: str | None = None,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "amount": amount,
        "contributed_at": contributed_at,
    }
    if note is not None:
        payload["note"] = note
    response = context.client.post(
        f"/api/v1/savings-goals/{goal_id}/contributions",
        headers=headers,
        json=payload,
    )
    assert response.status_code == 201
    return dict(response.json())
