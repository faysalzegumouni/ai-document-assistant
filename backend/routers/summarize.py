from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.database import get_db, Document
from models.schemas import SummarizeRequest, SummarizeResponse
from services.llm import summarize_text
from services.auth import get_current_user

router = APIRouter()


@router.post("/summarize", response_model=SummarizeResponse, tags=["AI"])
async def summarize_document(
    body: SummarizeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Generate a structured summary of a document. Requires authentication."""
    result = await db.execute(
        select(Document).where(
            Document.id == body.doc_id,
            Document.user_id == current_user["user_id"],
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {body.doc_id} not found.")

    summary = summarize_text(doc.text_content)
    return SummarizeResponse(summary=summary, doc_id=body.doc_id)
