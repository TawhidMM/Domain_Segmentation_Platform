from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.experiments import router as experiments_router
from app.api.runs import router as runs_router
from app.api.datasets import router as datasets_router
from app.api.annotations import router as annotations_router
from app.api.tools import router as tools_router
from app.core.config import settings
from app.core.startup import create_directories


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_directories()

    yield


app = FastAPI(
    title="Spatial Transcriptomics Backend",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080", "http://[::1]:8080"],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static/experiments", StaticFiles(directory=str(settings.EXPERIMENTS_ROOT)), name="static")
app.mount("/static/datasets", StaticFiles(directory=str(settings.UPLOAD_ROOT)), name="datasets")


app.include_router(
    experiments_router,
    prefix="/api/experiments",
    tags=["Experiments"]
)

app.include_router(
    runs_router,
    prefix="/api/runs",
    tags=["Runs"]
)

app.include_router(
    datasets_router,
    prefix="/api/datasets",
    tags=["Datasets"]
)

app.include_router(
    tools_router,
    prefix="/api/tools",
    tags=["Tools"]
)

app.include_router(
    annotations_router,
    prefix="/api",
    tags=["Annotations"]
)