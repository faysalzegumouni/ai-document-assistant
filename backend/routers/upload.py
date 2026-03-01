import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.database import get_db, Document
from models.schemas import UploadResponse
from services.text_extractor import extract_text
from services.embeddings import chunk_text, store_embeddings
from services.auth import get_current_user
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", 20))
ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}

os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=UploadResponse, tags=["Documents"])
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Upload a PDF, DOCX, or TXT document. Requires authentication."""
    extension = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '.{extension}' is not supported. Use PDF, DOCX, or TXT.",
        )

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size_mb:.1f} MB). Max allowed: {MAX_FILE_SIZE_MB} MB.",
        )

    save_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(save_path, "wb") as f:
        f.write(contents)

    try:
        text = extract_text(save_path, extension)
        if not text.strip():
            raise HTTPException(status_code=422, detail="Could not extract any text from the document.")

        doc = Document(
            file_name=file.filename,
            text_content=text,
            user_id=current_user["user_id"],
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)

        chunks = chunk_text(text)
        store_embeddings(doc.id, chunks)

    finally:
        if os.path.exists(save_path):
            os.remove(save_path)

    return UploadResponse(
        doc_id=doc.id,
        file_name=file.filename,
        message=f"Document uploaded and indexed successfully. {len(chunks)} chunks created.",
    )


@router.get("/documents", tags=["Documents"])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List documents for the authenticated user."""
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user["user_id"])
        .order_by(Document.upload_date.desc())
    )
    docs = result.scalars().all()
    return [
        {"doc_id": d.id, "file_name": d.file_name, "upload_date": d.upload_date}
        for d in docs
    ]


@router.delete("/document/{doc_id}", tags=["Documents"])
async def delete_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a document. Only the owner can delete it."""
    from services.embeddings import delete_document_embeddings

    result = await db.execute(
        select(Document).where(
            Document.id == doc_id,
            Document.user_id == current_user["user_id"],
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found.")

    delete_document_embeddings(doc_id)
    await db.delete(doc)
    await db.commit()

    return {"message": f"Document {doc_id} deleted successfully."}
