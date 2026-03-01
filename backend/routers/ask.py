from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.database import get_db, Document
from models.schemas import AskRequest, AskResponse
from services.embeddings import retrieve_relevant_chunks
from services.llm import generate_answer
from services.auth import get_current_user

router = APIRouter()


@router.post("/ask", response_model=AskResponse, tags=["AI"])
async def ask_question(
    body: AskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Ask a question about a document. Uses RAG pipeline. Requires authentication."""
    result = await db.execute(
        select(Document).where(
            Document.id == body.doc_id,
            Document.user_id == current_user["user_id"],
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {body.doc_id} not found.")

    chunks = retrieve_relevant_chunks(body.question, body.doc_id)
    if not chunks:
        raise HTTPException(
            status_code=422,
            detail="Could not retrieve relevant content. Try re-uploading the document.",
        )

    context = "\n\n---\n\n".join(chunks)
    answer = generate_answer(context, body.question)

    return AskResponse(answer=answer, doc_id=body.doc_id, question=body.question)
