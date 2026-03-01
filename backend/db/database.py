from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy import Column, Integer, String, Text, DateTime, func
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./documents.db")

# SQLAlchemy requires the async driver prefix:
# - PostgreSQL: postgresql+asyncpg://user:password@host:5432/dbname
# - SQLite (local dev): sqlite+aiosqlite:///./documents.db
# Supabase/Neon connection strings start with "postgresql://" — fix that:
if DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    # For PostgreSQL: set pool settings for production
    **({
        "pool_size": 5,
        "max_overflow": 10,
        "pool_pre_ping": True,
    } if "postgresql" in DATABASE_URL else {})
)

AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    plan = Column(String(50), default="free")
    created_at = Column(DateTime, server_default=func.now())


class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)  # nullable for backward compatibility
    file_name = Column(String(255), nullable=False)
    text_content = Column(Text, nullable=False)
    upload_date = Column(DateTime, server_default=func.now())


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
