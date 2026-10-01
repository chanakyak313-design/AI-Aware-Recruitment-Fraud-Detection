from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.api import app
from app.model_service import analyzer


client = TestClient(app)


def test_health_model_info_research_results():
    assert client.get("/api/health").status_code == 200
    info = client.get("/api/model-info")
    assert info.status_code == 200
    body = info.json()
    assert body["mode"] in {"DEMO MODE", "RESEARCH MODE"}
    research = client.get("/api/research-results")
    assert research.status_code == 200
    assert "available" in research.json()


def test_analyze_returns_required_shape():
    response = client.post(
        "/api/analyze",
        json={"title": "Analyst", "company": "Example", "description": "Work with a team."},
    )
    body = response.json()
    assert response.status_code == 200
    assert 0 <= body["fraud_probability"] <= 1
    if body["ai_generation_probability"] is not None:
        assert 0 <= body["ai_generation_probability"] <= 1
    assert "mode" in body
    assert "shap" in body


def test_analyze_rejects_malformed_and_oversized_input():
    assert client.post("/api/analyze", data="{").status_code == 422
    oversized = {"description": "x" * 20001}
    assert client.post("/api/analyze", json=oversized).status_code == 422


def test_training_refuses_undocumented_fraud_labels(tmp_path):
    path = tmp_path / "unlabelled.csv"
    pd.DataFrame([{"title": "Role", "company": "Company", "description": "Work"}]).to_csv(path, index=False)
    with pytest.raises(ValueError, match="documented fraud label"):
        analyzer._prepare_training_frame(path)


def test_ai_corpus_is_balanced_and_independent():
    path = Path(__file__).parents[2] / "data" / "ai_corpus" / "ai_labeled_corpus.csv"
    corpus = pd.read_csv(path)
    counts = corpus.groupby(["ai_generated", "fraudulent"]).size()
    assert len(corpus) == 40
    assert set(counts.tolist()) == {10}
    assert set(corpus["ai_generated"]) == {0, 1}
    assert set(corpus["fraudulent"]) == {0, 1}
    assert analyzer.model_summary["ai_model"]["available"] is True


def test_ai_aware_experiment_is_reported():
    experiment = analyzer.model_summary["ai_aware_experiments"]
    assert experiment["available"] is True
    assert "difference" in experiment
