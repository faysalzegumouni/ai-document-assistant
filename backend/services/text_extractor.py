import os
import fitz  # PyMuPDF
from docx import Document as DocxDocument


def extract_text(file_path: str, file_extension: str) -> str:
    """Dispatch text extraction based on file type."""
    ext = file_extension.lower().lstrip(".")
    if ext == "pdf":
        return _extract_pdf(file_path)
    elif ext == "docx":
        return _extract_docx(file_path)
    elif ext == "txt":
        return _extract_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def _extract_pdf(file_path: str) -> str:
    """Extract text from a PDF file using PyMuPDF."""
    text = []
    with fitz.open(file_path) as doc:
        for page in doc:
            text.append(page.get_text())
    return "\n".join(text).strip()


def _extract_docx(file_path: str) -> str:
    """Extract text from a DOCX file using python-docx."""
    doc = DocxDocument(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs).strip()


def _extract_txt(file_path: str) -> str:
    """Read a plain text file."""
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read().strip()
