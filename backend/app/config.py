import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
MODEL_DIR = BACKEND_DIR / "models"
DATA_DIR = ROOT_DIR / "data"
AI_CORPUS_DIR = DATA_DIR / "ai_corpus"
AI_CORPUS_PATH = AI_CORPUS_DIR / "ai_labeled_corpus.csv"
DEMO_DATA_PATH = DATA_DIR / "demo" / "demo_jobs.csv"
EMSCAD_DATA_PATH = DATA_DIR / "raw" / "fake_job_postings.csv"
RESULTS_DIR = ROOT_DIR / "results"
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]

MODEL_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)
