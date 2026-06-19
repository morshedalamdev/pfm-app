from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.modules.accounts.router import router as accounts_router
from app.modules.auth.router import router as auth_router
from app.modules.budgets.router import router as budgets_router
from app.modules.categories.router import router as categories_router
from app.modules.savings.router import router as savings_router
from app.modules.transactions.router import router as transactions_router
from app.modules.users.router import router as users_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(accounts_router)
api_router.include_router(categories_router)
api_router.include_router(transactions_router)
api_router.include_router(budgets_router)
api_router.include_router(savings_router)
api_router.include_router(health_router)
