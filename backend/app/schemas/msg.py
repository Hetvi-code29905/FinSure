# app/schemas/msg.py
from typing import Any, Optional
from pydantic import BaseModel


class MsgResponse(BaseModel):
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    detail: str
    code:   str


class PaginatedResponse(BaseModel):
    data:        list[Any]
    total:       int
    page:        int
    limit:       int
    total_pages: int
    has_next:    bool
    has_prev:    bool