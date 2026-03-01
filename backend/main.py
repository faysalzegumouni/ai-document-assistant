from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import traceback

from db.database import init_db
from routers import upload, ask, summarize, auth
from models.schemas import HealthResponse

# Rate limiter — keyed by IP address
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="AI Document Assistant API",
    description="Upload documents and interact with them using AI — summarize, ask questions, and more.",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limit error handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler — always returns JSON
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_detail = str(exc)
    print(f"[ERROR] {request.method} {request.url}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Server error: {error_detail}"},
    )


# Routers
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(ask.router)
app.include_router(summarize.router)


@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    return HealthResponse(status="ok", version="1.0.0")
