import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .config import ALLOWED_ORIGINS
from .model_service import analyzer
from .schemas import JobPayload

logger = logging.getLogger(__name__)

app = FastAPI(title="Recruitment Fraud Analyzer", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"chrome-extension://[a-z0-9]{32}",
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Recruitment Fraud Analyzer"}


@app.get("/api/model-info")
def model_info():
    return analyzer.get_model_info()


@app.get("/api/research-results")
def research_results():
    return analyzer.get_research_results()


@app.post("/api/analyze")
def analyze_job(payload: JobPayload):
    try:
        return analyzer.predict(payload.model_dump())
    except ValueError as error:
        logger.warning("Validation error in /api/analyze: %s", error)
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception:
        logger.exception("Unexpected error occurred while analyzing job posting")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while analyzing the job posting.",
        )
