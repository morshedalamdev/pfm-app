from __future__ import annotations

from decimal import Decimal
from typing import Annotated

from pydantic import Field, WithJsonSchema

MONEY_DECIMAL_STRING_SCHEMA = {
    "type": "string",
    "pattern": r"^(?!^[-+.]*$)[+-]?0*\d*\.?\d*$",
    "description": "Decimal string with up to 18 digits and 4 decimal places.",
    "examples": ["12.3400"],
}

PositiveMoney = Annotated[
    Decimal,
    Field(gt=Decimal("0"), max_digits=18, decimal_places=4),
    WithJsonSchema(MONEY_DECIMAL_STRING_SCHEMA),
]

NonNegativeMoney = Annotated[
    Decimal,
    Field(ge=Decimal("0"), max_digits=18, decimal_places=4),
    WithJsonSchema(MONEY_DECIMAL_STRING_SCHEMA),
]
