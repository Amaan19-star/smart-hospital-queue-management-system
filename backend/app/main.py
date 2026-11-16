from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.core.database import Base, engine
from backend.app.seed import seed_database
from backend.app.api import auth, departments, doctors, appointments, queue, admin, cases

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist and seed database
    Base.metadata.create_all(bind=engine)
    try:
        seed_database()
    except Exception as e:
        print(f"Seed note: {e}")
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for Smart Hospital Queue Management System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(departments.router, prefix=settings.API_V1_STR)
app.include_router(doctors.router, prefix=settings.API_V1_STR)
app.include_router(appointments.router, prefix=settings.API_V1_STR)
app.include_router(queue.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(cases.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "status": "online",
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "hospital-queue-api"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
