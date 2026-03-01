from pydantic import BaseModel, EmailStr
from typing import Optional


class UploadResponse(BaseModel):
    doc_id: int
    file_name: str
    message: str


class AskRequest(BaseModel):
    doc_id: int
    question: str


class AskResponse(BaseModel):
    answer: str
    doc_id: int
    question: str


class SummarizeRequest(BaseModel):
    doc_id: int


class SummarizeResponse(BaseModel):
    summary: str
    doc_id: int


class HealthResponse(BaseModel):
    status: str
    version: str


# ── Auth ──────────────────────────────────────────────
class UserRegister(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    email: str

