from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from backend.app.config import settings

# Format Database URL for Async SQLAlchemy
raw_db_url = settings.DATABASE_URL or "sqlite+aiosqlite:///./saferoute.db"

# Automatically normalize postgres / postgresql URLs to asyncpg for Supabase / Neon / Render
if raw_db_url.startswith("postgres://"):
    async_db_url = raw_db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif raw_db_url.startswith("postgresql://") and not raw_db_url.startswith("postgresql+asyncpg://"):
    async_db_url = raw_db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
else:
    async_db_url = raw_db_url

# Async database engine (supports SQLite and hosted PostgreSQL)
engine = create_async_engine(
    async_db_url,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in async_db_url else {}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
