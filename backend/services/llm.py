import os
from groq import Groq
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()

_groq_client = None

# Model: llama-3.3-70b-versatile — free, fast, high quality
GROQ_MODEL = "llama-3.3-70b-versatile"


def _get_client() -> Groq:
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key or api_key == "your_groq_api_key_here":
            raise HTTPException(
                status_code=500,
                detail="GROQ_API_KEY is not configured. Add it to backend/.env (free at console.groq.com)"
            )
        _groq_client = Groq(api_key=api_key)
    return _groq_client


def _chat(system_prompt: str, user_message: str) -> str:
    """Call the Groq chat API and return the response text."""
    client = _get_client()
    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=0.3,
            max_tokens=2048,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        err = str(e)
        if "429" in err or "rate_limit" in err.lower():
            raise HTTPException(
                status_code=429,
                detail="⏳ Rate limit reached. Please wait a moment and try again."
            )
        raise HTTPException(status_code=500, detail=f"AI error: {err[:300]}")


def generate_answer(context: str, question: str) -> str:
    """Generate an answer to a question based on the provided document context."""
    system = (
        "You are an expert document analyst. Answer the user's question using the provided document context. "
        "You may infer answers from what is clearly implied in the context, even if not stated word-for-word. "
        "Give direct, confident answers. Only say you cannot answer if the question is completely unrelated to the document. "
        "Never start your answer with 'I couldn't find'. Format your response clearly with bullets or numbered lists when appropriate."
    )
    user = f"Document context:\n{context}\n\nQuestion: {question}"
    return _chat(system, user)


def summarize_text(text: str) -> str:
    """Generate a structured summary of the provided document."""
    # Truncate to ~6000 tokens worth of chars
    truncated = text[:12000] if len(text) > 12000 else text

    system = "You are an expert document summarizer. Be concise, clear, and structured."
    user = f"""Summarize the following document with:
1. A brief overview (2-3 sentences)
2. Key points (bullet list)
3. Main conclusions or takeaways

Document:
{truncated}"""
    return _chat(system, user)
