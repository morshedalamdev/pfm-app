from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.modules.accounts.models import Account
from app.modules.accounts.repositories import AccountRepository
from app.modules.categories.models import Category
from app.modules.categories.repositories import CategoryRepository
from app.modules.transactions.models import Transaction
from app.modules.transactions.repositories import TransactionRepository
from app.modules.transactions.schemas import (
    TransactionCreateRequest,
    TransactionListResponse,
    TransactionResponse,
    TransactionUpdateRequest,
)
from app.modules.users.models import User


class TransactionNotFoundError(Exception):
    pass


class InvalidTransactionStateError(Exception):
    pass


class InvalidTransactionReferenceError(Exception):
    pass


class TransactionService:
    def __init__(
        self,
        transactions: TransactionRepository,
        accounts: AccountRepository,
        categories: CategoryRepository,
    ) -> None:
        self.transactions = transactions
        self.accounts = accounts
        self.categories = categories

    async def create_transaction(
        self,
        request: TransactionCreateRequest,
        current_user: User,
    ) -> Transaction:
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
        await self.transactions.create(transaction)
        await self.transactions.commit()
        await self.transactions.refresh(transaction)
        return transaction

    async def list_transactions(self, current_user: User) -> TransactionListResponse:
        transactions = await self.transactions.list_owned_income_expense(
            current_user.id
        )
        return TransactionListResponse(
            items=[
                TransactionResponse.model_validate(transaction)
                for transaction in transactions
            ]
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
