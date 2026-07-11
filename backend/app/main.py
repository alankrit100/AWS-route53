import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db
from app.routers import auth, zones, records, tags, changes


@asynccontextmanager
async def lifespan(app: FastAPI):
    if os.getenv("TESTING") != "1":
        init_db()
        from app.database import SessionLocal
        from app.seed import seed_database
        db = SessionLocal()
        try:
            seed_database(db)
        finally:
            db.close()
    yield


app = FastAPI(
    title="Route53 Clone API",
    description="Functional clone of AWS Route53 API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def route53_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict):
        body = exc.detail.copy()
        body.setdefault("type", "ERROR")
        return JSONResponse(status_code=exc.status_code, content=body)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "Error", "message": str(exc.detail), "type": "ERROR"},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "InternalError", "message": "An internal error occurred.", "type": "ERROR"},
    )


app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(zones.router, prefix="/api/zones", tags=["Hosted Zones"])
app.include_router(records.router, prefix="/api/zones", tags=["DNS Records"])
app.include_router(tags.router, prefix="/api", tags=["Tags"])
app.include_router(changes.router, prefix="/api/changes", tags=["Changes"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
