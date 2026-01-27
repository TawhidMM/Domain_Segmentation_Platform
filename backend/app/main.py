from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.experiments import router as experiments_router
from app.api.datasets import router as datasets_router
from app.api.tools import router as tools_router

app = FastAPI(title="Spatial Transcriptomics Backend")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://[::]:8080"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    experiments_router,
    prefix="/api/experiments",
    tags=["Experiments"]
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
