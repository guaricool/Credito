from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
import app.models  # Ensure models are registered in Base.metadata

from app.routers import auth_router, parser_router, compliance_router, dispute_router, leak_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure all DB tables exist on application startup
    await init_db()
    yield

app = FastAPI(title="US Credit Law & Dispute Platform API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(parser_router.router)
app.include_router(compliance_router.router)
app.include_router(dispute_router.router)
app.include_router(leak_router.router)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "credit_law_api"}

