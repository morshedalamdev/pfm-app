from __future__ import annotations

import hashlib
import json
import uuid
from datetime import UTC, datetime, timedelta
from typing import cast

from fastapi.encoders import jsonable_encoder

from app.modules.accounts.models import Account
from app.modules.accounts.repositories import AccountRepository
from app.modules.categories.models import Category
from app.modules.categories.repositories import CategoryRepository
from app.modules.idempotency.models import IdempotencyRecord
from app.modules.idempotency.repositories import IdempotencyRepository
from app.modules.savings.models import SavingsContribution, SavingsGoal
from app.modules.savings.repositories import SavingsRepository
from app.modules.savings.services import SavingsService
from app.modules.transactions.models import Transaction, TransferLink
from app.modules.transactions.pagination import (
    InvalidTransactionCursorError as CursorDecodeError,
)
from app.modules.transactions.pagination import (
    decode_transaction_cursor,
    encode_transaction_cursor,
)
from app.modules.transactions.repositories import TransactionRepository
from app.modules.transactions.schemas import (
    TransactionCreateRequest,
    TransactionFilterType,
    TransactionListResponse,
    TransactionResponse,
    TransactionUpdateRequest,
    SavingsTransferCreateRequest,
    SavingsTransferResponse,
    TransferCreateRequest,
    TransferResponse,
)
from app.modules.users.models import User


class TransactionNotFoundError(Exception):
    pass


class TransferNotFoundError(Exception):
    pass


class InvalidTransactionStateError(Exception):
    pass


class InvalidTransactionReferenceError(Exception):
    pass


class InvalidTransferRequestError(Exception):
    pass


class InvalidSavingsTransferRequestError(Exception):
    pass


class InvalidTransactionCursorError(Exception):
    pass


class InvalidTransactionFilterError(Exception):
    pass


class IdempotencyConflictError(Exception):
    pass


class IdempotencyInProgressError(Exception):
    pass


class TransactionService:
    def __init__(
        self,
        transactions: TransactionRepository,
        accounts: AccountRepository,
        categories: CategoryRepository,
        savings: SavingsRepository | None = None,
        idempotency: IdempotencyRepository | None = None,
    ) -> None:
        self.transactions = transactions
        self.accounts = accounts
        self.categories = categories
        self.savings = savings
        self.idempotency = idempotency

    async def create_transaction(
        self,
        request: TransactionCreateRequest,
        current_user: User,
        idempotency_key: str | None = None,
    ) -> TransactionResponse:
        if idempotency_key is not None:
            existing_response = await self.get_idempotent_response(
                operation="transactions.create",
                idempotency_key=idempotency_key,
                request_payload=request.model_dump(mode="json"),
                current_user=current_user,
                response_model=TransactionResponse,
            )
            if existing_response is not None:
                return cast(TransactionResponse, existing_response)

        account = await self.get_active_account(request.account_id, current_user)
        category = await self.get_active_category(
            request.category_id,
            current_user,
            request.type,
        )

        transaction = Transaction(
            user_id=current_user.id,
            account_id=account.id,
            category_id=category.id,
            type=request.type,
            amount=request.amount,
            currency=account.currency,
            transaction_at=request.transaction_at,
            description=request.description,
        )
        try:
            await self.transactions.create(transaction)
            await self.transactions.refresh(transaction)
            response = TransactionResponse.model_validate(transaction)
            await self.store_idempotent_response(
                operation="transactions.create",
                idempotency_key=idempotency_key,
                request_payload=request.model_dump(mode="json"),
                current_user=current_user,
                response=response,
            )
            await self.transactions.commit()
        except Exception:
            await self.transactions.rollback()
            raise
        return response

    async def list_transactions(
        self,
        current_user: User,
        *,
        cursor: str | None,
        limit: int,
        date_from: datetime | None,
        date_to: datetime | None,
        account_id: uuid.UUID | None,
        category_id: uuid.UUID | None,
        transaction_type: TransactionFilterType | None,
        search: str | None,
    ) -> TransactionListResponse:
        try:
            page_cursor = decode_transaction_cursor(cursor)
        except CursorDecodeError as exc:
            raise InvalidTransactionCursorError from exc

        date_from = self.normalize_filter_datetime(date_from)
        date_to = self.normalize_filter_datetime(date_to)
        if date_from is not None and date_to is not None and date_from > date_to:
            raise InvalidTransactionFilterError
        if account_id is not None:
            account = await self.accounts.get_owned(account_id, current_user.id)
            if account is None:
                raise InvalidTransactionFilterError
        if category_id is not None:
            category = await self.categories.get_owned(category_id, current_user.id)
            if category is None:
                raise InvalidTransactionFilterError

        normalized_search = search.strip() if search is not None else None
        if normalized_search == "":
            normalized_search = None

        transactions = await self.transactions.list_owned_transactions(
            current_user.id,
            cursor=page_cursor,
            limit=limit + 1,
            date_from=date_from,
            date_to=date_to,
            account_id=account_id,
            category_id=category_id,
            transaction_type=transaction_type,
            search=normalized_search,
        )
        has_more = len(transactions) > limit
        visible_transactions = transactions[:limit]
        next_cursor = (
            encode_transaction_cursor(
                visible_transactions[-1].transaction_at,
                visible_transactions[-1].created_at,
                visible_transactions[-1].id,
            )
            if has_more and visible_transactions
            else None
        )
        return TransactionListResponse(
            items=[
                TransactionResponse.model_validate(transaction)
                for transaction in visible_transactions
            ],
            next_cursor=next_cursor,
            has_more=has_more,
        )

    async def get_transaction(
        self,
        transaction_id: uuid.UUID,
        current_user: User,
    ) -> Transaction:
        transaction = await self.transactions.get_owned(transaction_id, current_user.id)
        if transaction is None:
            raise TransactionNotFoundError
        return transaction

    async def update_transaction(
        self,
        transaction_id: uuid.UUID,
        request: TransactionUpdateRequest,
        current_user: User,
    ) -> Transaction:
        transaction = await self.get_transaction(transaction_id, current_user)
        if transaction.voided_at is not None:
            raise InvalidTransactionStateError

        account_id = request.account_id or transaction.account_id
        category_id = request.category_id or transaction.category_id
        if category_id is None:
            raise InvalidTransactionReferenceError
        account = await self.get_active_account(account_id, current_user)
        category = await self.get_active_category(
            category_id, current_user, transaction.type
        )

        update_data = request.model_dump(exclude_unset=True)
        update_data.pop("account_id", None)
        update_data.pop("category_id", None)
        transaction.account_id = account.id
        transaction.category_id = category.id
        transaction.currency = account.currency
        for field_name, value in update_data.items():
            setattr(transaction, field_name, value)

        await self.transactions.commit()
        await self.transactions.refresh(transaction)
        return transaction

    async def void_transaction(
        self,
        transaction_id: uuid.UUID,
        current_user: User,
    ) -> Transaction:
        transaction = await self.get_transaction(transaction_id, current_user)
        if transaction.voided_at is None:
            transaction.voided_at = datetime.now(UTC)
            await self.transactions.commit()
            await self.transactions.refresh(transaction)
        return transaction

    async def create_transfer(
        self,
        request: TransferCreateRequest,
        current_user: User,
        idempotency_key: str | None = None,
    ) -> TransferResponse:
        if idempotency_key is not None:
            existing_response = await self.get_idempotent_response(
                operation="transfers.create",
                idempotency_key=idempotency_key,
                request_payload=request.model_dump(mode="json"),
                current_user=current_user,
                response_model=TransferResponse,
            )
            if existing_response is not None:
                return cast(TransferResponse, existing_response)

        from_account = await self.get_active_account(
            request.from_account_id,
            current_user,
        )
        to_account = await self.get_active_account(
            request.to_account_id,
            current_user,
        )
        if from_account.id == to_account.id:
            raise InvalidTransferRequestError
        if from_account.currency != to_account.currency:
            raise InvalidTransferRequestError

        debit_transaction = Transaction(
            user_id=current_user.id,
            account_id=from_account.id,
            category_id=None,
            type="transfer_debit",
            amount=request.amount,
            currency=from_account.currency,
            transaction_at=request.transaction_at,
            description=request.description,
        )
        credit_transaction = Transaction(
            user_id=current_user.id,
            account_id=to_account.id,
            category_id=None,
            type="transfer_credit",
            amount=request.amount,
            currency=to_account.currency,
            transaction_at=request.transaction_at,
            description=request.description,
        )

        try:
            await self.transactions.create(debit_transaction)
            await self.transactions.create(credit_transaction)
            transfer_link = TransferLink(
                user_id=current_user.id,
                debit_transaction_id=debit_transaction.id,
                credit_transaction_id=credit_transaction.id,
                amount=request.amount,
                currency=from_account.currency,
            )
            await self.transactions.create_transfer_link(transfer_link)
            await self.transactions.refresh(debit_transaction)
            await self.transactions.refresh(credit_transaction)
            await self.transactions.refresh_transfer_link(transfer_link)
            response = self.build_transfer_response(
                transfer_link,
                debit_transaction,
                credit_transaction,
            )
            await self.store_idempotent_response(
                operation="transfers.create",
                idempotency_key=idempotency_key,
                request_payload=request.model_dump(mode="json"),
                current_user=current_user,
                response=response,
            )
            await self.transactions.commit()
        except Exception:
            await self.transactions.rollback()
            raise
        return response

    async def get_transfer(
        self,
        transfer_id: uuid.UUID,
        current_user: User,
    ) -> TransferResponse:
        transfer = await self.transactions.get_owned_transfer(
            transfer_id,
            current_user.id,
        )
        if transfer is None:
            raise TransferNotFoundError
        transfer_link, debit_transaction, credit_transaction = transfer
        return self.build_transfer_response(
            transfer_link,
            debit_transaction,
            credit_transaction,
        )

    async def create_savings_transfer(
        self,
        request: SavingsTransferCreateRequest,
        current_user: User,
        idempotency_key: str | None = None,
    ) -> SavingsTransferResponse:
        if idempotency_key is not None:
            existing_response = await self.get_idempotent_response(
                operation="savings_transfers.create",
                idempotency_key=idempotency_key,
                request_payload=request.model_dump(mode="json"),
                current_user=current_user,
                response_model=SavingsTransferResponse,
            )
            if existing_response is not None:
                return cast(SavingsTransferResponse, existing_response)

        if self.savings is None:
            raise RuntimeError("Savings repository is required")

        from_account = await self.get_active_account(
            request.from_account_id,
            current_user,
        )
        savings_goal = await self.get_active_savings_goal(
            request.savings_goal_id,
            current_user,
        )
        if from_account.currency != savings_goal.currency:
            raise InvalidSavingsTransferRequestError

        debit_transaction = Transaction(
            user_id=current_user.id,
            account_id=from_account.id,
            category_id=None,
            type="transfer_debit",
            amount=request.amount,
            currency=from_account.currency,
            transaction_at=request.transaction_at,
            description=request.description,
        )
        contribution = SavingsContribution(
            user_id=current_user.id,
            goal_id=savings_goal.id,
            amount=request.amount,
            currency=savings_goal.currency,
            contributed_at=request.transaction_at,
            note=request.description,
        )

        try:
            await self.transactions.create(debit_transaction)
            await self.savings.create_contribution(contribution)
            saved_amount = await self.savings.calculate_saved_amount(
                savings_goal.id,
                current_user.id,
            )
            SavingsService(self.savings).apply_completion_state(
                savings_goal,
                saved_amount,
            )
            await self.transactions.refresh(debit_transaction)
            await self.savings.refresh_contribution(contribution)
            response = self.build_savings_transfer_response(
                debit_transaction,
                contribution,
            )
            await self.store_idempotent_response(
                operation="savings_transfers.create",
                idempotency_key=idempotency_key,
                request_payload=request.model_dump(mode="json"),
                current_user=current_user,
                response=response,
            )
            await self.transactions.commit()
        except Exception:
            await self.transactions.rollback()
            raise
        return response

    async def get_idempotent_response(
        self,
        *,
        operation: str,
        idempotency_key: str,
        request_payload: dict[str, object],
        current_user: User,
        response_model: type[TransactionResponse] | type[TransferResponse],
    ) -> TransactionResponse | TransferResponse | SavingsTransferResponse | None:
        record = await self.get_idempotency_record(
            operation=operation,
            idempotency_key=idempotency_key,
            request_payload=request_payload,
            current_user=current_user,
        )
        if record is None:
            return None
        if record.response_body is None:
            raise IdempotencyInProgressError
        return response_model.model_validate(record.response_body)

    async def store_idempotent_response(
        self,
        *,
        operation: str,
        idempotency_key: str | None,
        request_payload: dict[str, object],
        current_user: User,
        response: TransactionResponse | TransferResponse | SavingsTransferResponse,
    ) -> None:
        if idempotency_key is None:
            return
        if self.idempotency is None:
            raise RuntimeError("Idempotency repository is required")
        normalized_key = idempotency_key.strip()
        request_hash = build_request_hash(operation, request_payload)
        now = datetime.now(UTC)
        record = IdempotencyRecord(
            user_id=current_user.id,
            operation=operation,
            idempotency_key=normalized_key,
            request_hash=request_hash,
            response_status_code=201,
            response_body=jsonable_encoder(response.model_dump(mode="json")),
            locked_until=None,
            expires_at=now + timedelta(hours=24),
        )
        await self.idempotency.create(record)

    async def get_idempotency_record(
        self,
        *,
        operation: str,
        idempotency_key: str,
        request_payload: dict[str, object],
        current_user: User,
    ) -> IdempotencyRecord | None:
        if self.idempotency is None:
            raise RuntimeError("Idempotency repository is required")
        normalized_key = idempotency_key.strip()
        if not normalized_key:
            raise IdempotencyConflictError
        request_hash = build_request_hash(operation, request_payload)
        record = await self.idempotency.get(
            user_id=current_user.id,
            operation=operation,
            idempotency_key=normalized_key,
        )
        if record is None:
            return None
        if record.request_hash != request_hash:
            raise IdempotencyConflictError
        return record

    async def get_active_account(
        self,
        account_id: uuid.UUID,
        current_user: User,
    ) -> Account:
        account = await self.accounts.get_owned(account_id, current_user.id)
        if account is None or account.archived_at is not None:
            raise InvalidTransactionReferenceError
        return account

    async def get_active_category(
        self,
        category_id: uuid.UUID,
        current_user: User,
        transaction_type: str,
    ) -> Category:
        category = await self.categories.get_owned(category_id, current_user.id)
        if category is None or category.archived_at is not None:
            raise InvalidTransactionReferenceError
        if category.kind != transaction_type:
            raise InvalidTransactionReferenceError
        return category

    async def get_active_savings_goal(
        self,
        savings_goal_id: uuid.UUID,
        current_user: User,
    ) -> SavingsGoal:
        if self.savings is None:
            raise RuntimeError("Savings repository is required")
        goal = await self.savings.get_goal_owned(savings_goal_id, current_user.id)
        if goal is None or goal.status != "active":
            raise InvalidSavingsTransferRequestError
        return goal

    @staticmethod
    def build_transfer_response(
        transfer_link: TransferLink,
        debit_transaction: Transaction,
        credit_transaction: Transaction,
    ) -> TransferResponse:
        return TransferResponse(
            id=transfer_link.id,
            from_account_id=debit_transaction.account_id,
            to_account_id=credit_transaction.account_id,
            debit_transaction_id=debit_transaction.id,
            credit_transaction_id=credit_transaction.id,
            amount=transfer_link.amount,
            currency=transfer_link.currency,
            transaction_at=debit_transaction.transaction_at,
            description=debit_transaction.description,
            created_at=transfer_link.created_at,
        )

    @staticmethod
    def build_savings_transfer_response(
        debit_transaction: Transaction,
        contribution: SavingsContribution,
    ) -> SavingsTransferResponse:
        return SavingsTransferResponse(
            id=contribution.id,
            from_account_id=debit_transaction.account_id,
            savings_goal_id=contribution.goal_id,
            debit_transaction_id=debit_transaction.id,
            contribution_id=contribution.id,
            amount=contribution.amount,
            currency=contribution.currency,
            transaction_at=debit_transaction.transaction_at,
            description=debit_transaction.description,
            created_at=contribution.created_at,
        )

    @staticmethod
    def normalize_filter_datetime(value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            raise InvalidTransactionFilterError
        return value.astimezone(UTC)


def build_request_hash(operation: str, request_payload: dict[str, object]) -> str:
    canonical_payload = json.dumps(
        {
            "operation": operation,
            "request": request_payload,
        },
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )
    return hashlib.sha256(canonical_payload.encode()).hexdigest()
