from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.modules.auth.dependencies import CurrentUserDependency
from app.modules.reports.repositories import ReportRepository
from app.modules.reports.schemas import (
    CashFlowReportResponse,
    DashboardPeriod,
    DashboardReportResponse,
    MonthlyReportQuery,
    MonthlySummaryReportResponse,
    ReportDateRangeQuery,
    ReportDateTimeRangeQuery,
    ReportTransactionType,
    SpendingByCategoryReportResponse,
)
from app.modules.reports.services import ReportService

router = APIRouter(prefix="/reports", tags=["reports"])
SessionDependency = Annotated[AsyncSession, Depends(get_session)]


def build_report_service(session: AsyncSession) -> ReportService:
    return ReportService(reports=ReportRepository(session))


@router.get("/dashboard", response_model=DashboardReportResponse)
async def get_dashboard_report(
    current_user: CurrentUserDependency,
    session: SessionDependency,
    period: Annotated[DashboardPeriod, Query()],
    type: Annotated[ReportTransactionType, Query()],  # noqa: A002
    as_of: Annotated[date | None, Query()] = None,
) -> DashboardReportResponse:
    return await build_report_service(session).get_dashboard_report(
        current_user,
        period=period,
        transaction_type=type,
        as_of=as_of,
    )


@router.get("/monthly-summary", response_model=MonthlySummaryReportResponse)
async def get_monthly_summary_report(
    current_user: CurrentUserDependency,
    session: SessionDependency,
    query: Annotated[MonthlyReportQuery, Depends()],
) -> MonthlySummaryReportResponse:
    return await build_report_service(session).get_monthly_summary_report(
        current_user,
        query=query,
    )


@router.get("/cash-flow", response_model=CashFlowReportResponse)
async def get_cash_flow_report(
    current_user: CurrentUserDependency,
    session: SessionDependency,
    query: Annotated[ReportDateRangeQuery, Depends()],
) -> CashFlowReportResponse:
    return await build_report_service(session).get_cash_flow_report(
        current_user,
        query=query,
    )


@router.get(
    "/spending-by-category",
    response_model=SpendingByCategoryReportResponse,
)
async def get_spending_by_category_report(
    current_user: CurrentUserDependency,
    session: SessionDependency,
    query: Annotated[ReportDateTimeRangeQuery, Depends()],
) -> SpendingByCategoryReportResponse:
    return await build_report_service(session).get_spending_by_category_report(
        current_user,
        query=query,
    )
