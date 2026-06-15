from __future__ import annotations

from app.modules.auth.repositories import RefreshSessionRepository
from app.modules.users.repositories import UserRepository


class AuthService:
    def __init__(
        self,
        users: UserRepository,
        refresh_sessions: RefreshSessionRepository,
    ) -> None:
        self.users = users
        self.refresh_sessions = refresh_sessions
