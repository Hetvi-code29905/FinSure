# app/api/v1/api.py
from fastapi import APIRouter

from app.api.v1.endpoints.auth         import router as auth_router
from app.api.v1.endpoints.users        import router as users_router
from .endpoints.transactions import router as transactions_router
from .endpoints.accounts     import router as accounts_router
from .endpoints.income       import router as income_router
from app.api.v1.endpoints.risk         import router as risk_router
from app.api.v1.endpoints.forecast     import router as forecast_router
from app.api.v1.endpoints.safety       import router as safety_router
from app.api.v1.endpoints.budget       import router as budget_router
from app.api.v1.endpoints.goals        import router as goals_router
from app.api.v1.endpoints.subscriptions import router as subscriptions_router
from app.api.v1.endpoints.insights      import router as insights_router
from app.api.v1.endpoints.calendar      import router as calendar_router

from app.api.v1.endpoints.health       import router as health_router

api_router = APIRouter()

# Registering with prefixes so the Frontend can find them
api_router.include_router(health_router,       prefix="/health",       tags=["health"])
api_router.include_router(auth_router,         prefix="/auth",         tags=["auth"])
api_router.include_router(users_router,        prefix="/users",        tags=["users"])
api_router.include_router(accounts_router,     prefix="/accounts",     tags=["accounts"])
api_router.include_router(transactions_router, prefix="/transactions", tags=["transactions"])
api_router.include_router(income_router,       prefix="/income",       tags=["income"])
api_router.include_router(risk_router,         prefix="/risk",         tags=["risk"])
api_router.include_router(forecast_router,     prefix="/forecast",     tags=["forecast"])
api_router.include_router(safety_router,       prefix="/safety",       tags=["safety"])
api_router.include_router(budget_router,       prefix="/budget",       tags=["budget"])
api_router.include_router(goals_router,        prefix="/goals",        tags=["goals"])
api_router.include_router(subscriptions_router, prefix="/subscriptions", tags=["subscriptions"])
api_router.include_router(insights_router,      prefix="/insights",      tags=["insights"])
api_router.include_router(calendar_router,      prefix="/calendar",      tags=["calendar"])