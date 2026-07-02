from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
