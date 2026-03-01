import os
import pickle
import numpy as np
import faiss
import google.generativeai as genai
from dotenv import load_dotenv
from typing import List, Dict

load_dotenv()

# Gemini embedding model (free tier, runs remotely)
EMBED_MODEL = "models/gemini-embedding-001"

_client_configured = False
_vector_store: Dict[int, Dict] = {}

VECTOR_STORE_PATH = os.path.join(os.path.dirname(__file__), "..", "vector_store.pkl")


def _configure_genai():
    global _client_configured
    if not _client_configured:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set in your .env file.")
        genai.configure(api_key=api_key)
        _client_configured = True


def _load_store():
    global _vector_store
    if not _vector_store and os.path.exists(VECTOR_STORE_PATH):
        with open(VECTOR_STORE_PATH, "rb") as f:
            _vector_store = pickle.load(f)


def _save_store():
    with open(VECTOR_STORE_PATH, "wb") as f:
        pickle.dump(_vector_store, f)


def _embed_texts(texts: List[str]) -> np.ndarray:
    """Embed a list of texts using Google Gemini embedding API."""
    _configure_genai()
    result = genai.embed_content(
        model=EMBED_MODEL,
        content=texts,
        task_type="retrieval_document",
    )
    return np.array(result["embedding"], dtype="float32")


def _embed_query(query: str) -> np.ndarray:
    """Embed a single query using Google Gemini embedding API."""
    _configure_genai()
    result = genai.embed_content(
        model=EMBED_MODEL,
        content=query,
        task_type="retrieval_query",
    )
    return np.array(result["embedding"], dtype="float32").reshape(1, -1)


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Split text into overlapping chunks for better retrieval."""
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks


def store_embeddings(doc_id: int, chunks: List[str]) -> None:
    """Generate embeddings via Gemini API and store them in FAISS."""
    _load_store()

    # Embed in batches of 100 (Gemini API limit)
    all_embeddings = []
    for i in range(0, len(chunks), 100):
        batch = chunks[i:i + 100]
        emb = _embed_texts(batch)
        # If batch returns a 1D array (single item), reshape
        if emb.ndim == 1:
            emb = emb.reshape(1, -1)
        all_embeddings.append(emb)

    embeddings = np.vstack(all_embeddings).astype("float32")
    faiss.normalize_L2(embeddings)

    _vector_store[doc_id] = {"chunks": chunks, "embeddings": embeddings}
    _save_store()


def retrieve_relevant_chunks(query: str, doc_id: int, top_k: int = 5) -> List[str]:
    """Retrieve the most relevant chunks using FAISS cosine similarity."""
    _load_store()

    if doc_id not in _vector_store:
        return []

    entry = _vector_store[doc_id]
    chunks = entry["chunks"]
    embeddings = entry["embeddings"].astype("float32")

    if len(chunks) == 0:
        return []

    # Build FAISS index
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)

    # Encode query
    query_vec = _embed_query(query).astype("float32")
    faiss.normalize_L2(query_vec)

    k = min(top_k, len(chunks))
    scores, indices = index.search(query_vec, k)

    return [chunks[i] for i in indices[0] if i != -1]


def delete_document_embeddings(doc_id: int) -> None:
    """Remove all embeddings for a given document."""
    _load_store()
    if doc_id in _vector_store:
        del _vector_store[doc_id]
        _save_store()
