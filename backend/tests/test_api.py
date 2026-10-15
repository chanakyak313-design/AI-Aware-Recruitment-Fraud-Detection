from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.api import app
from app.data_pipeline import extract_company_domain
from app.model_service import _sanitize_path_value, _sanitize_public_payload, analyzer


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
    assert "autopsy" in body
    assert {item["item"] for item in body["autopsy"]["safety"]} >= {
        "Company information", "Salary transparency", "Upfront fee request"
    }
    graph = body["autopsy"]["evidence_graph"]
    assert graph["nodes"][0]["kind"] == "posting"
    assert graph["nodes"][-1]["kind"] == "assessment"
    assert all(
        0 <= edge[endpoint] < len(graph["nodes"])
        for edge in graph["edges"]
        for endpoint in ("from", "to")
    )


def test_autopsy_compares_only_user_supplied_sources():
    response = client.post(
        "/api/analyze",
        json={
            "title": "Analyst",
            "company": "Example",
            "description": "Work with a team.",
            "salary": "$80,000 per year",
            "comparison_sources": [
                {"platform": "Indeed", "title": "Analyst", "company": "Example", "salary": "$60,000 per year"}
            ],
        },
    )
    assert response.status_code == 200
    autopsy = response.json()["autopsy"]
    assert autopsy["comparisons"][0]["status"] == "mismatch"
    assert autopsy["comparisons"][0]["differences"] == [
        {"field": "Salary", "primary": "$80,000 per year", "other": "$60,000 per year"}
    ]
    assert autopsy["salary"]["benchmark"] is None


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


def test_company_domain_extraction_handles_dotless_and_normal_values():
    assert extract_company_domain("https://www.example.com/jobs") == "example"
    assert extract_company_domain("https://example.com") == "example"
    assert extract_company_domain("fastcashnow.xyz") == "fastcashnow"
    assert extract_company_domain("http://localhost") == "localhost"
    assert extract_company_domain("http://localhost:8000/api") == "localhost"
    assert extract_company_domain("intranet") == "intranet"
    assert extract_company_domain("") == ""

    # Ensure dotless website does not crash POST /api/analyze
    res_dotless = client.post(
        "/api/analyze",
        json={
            "title": "Engineer",
            "company": "Tech Corp",
            "description": "Software engineer role",
            "website": "http://localhost",
        },
    )
    assert res_dotless.status_code == 200

    # Ensure normal website succeeds as before
    res_normal = client.post(
        "/api/analyze",
        json={
            "title": "Engineer",
            "company": "Tech Corp",
            "description": "Software engineer role",
            "website": "https://example.com",
        },
    )
    assert res_normal.status_code == 200


def test_api_paths_do_not_leak_local_user_directories():
    def assert_no_local_paths(data):
        if isinstance(data, dict):
            for key, val in data.items():
                assert_no_local_paths(val)
        elif isinstance(data, list):
            for item in data:
                assert_no_local_paths(item)
        elif isinstance(data, str):
            low = data.lower()
            assert "users\\" not in low and "users/" not in low, f"Found user directory in '{data}'"
            assert ":\\" not in data and ":/" not in data, f"Found drive letter path in '{data}'"

    info_res = client.get("/api/model-info")
    assert info_res.status_code == 200
    info = info_res.json()
    assert_no_local_paths(info)
    assert not Path(info["dataset_path"]).is_absolute()
    assert "fake_job_postings.csv" in info["dataset_path"]

    research_res = client.get("/api/research-results")
    assert research_res.status_code == 200
    research = research_res.json()
    assert_no_local_paths(research)
    if research.get("available"):
        assert not Path(research["dataset_path"]).is_absolute()
        assert not Path(research["ai_model"]["corpus_path"]).is_absolute()

    # Regression check: URLs remain unchanged while Windows paths are sanitized
    sample_payload = {
        "website_url": "https://example.com/careers/job?id=123",
        "dataset_path": "C:\\Users\\Developer\\MINPROJ\\data\\raw\\fake_job_postings.csv",
        "nested": {
            "source_url": "http://localhost:8000/api/analyze",
            "corpus_path": "C:\\Users\\Developer\\MINPROJ\\data\\ai_corpus\\ai_labeled_corpus.csv",
        },
    }
    sanitized = _sanitize_public_payload(sample_payload)
    assert sanitized["website_url"] == "https://example.com/careers/job?id=123"
    assert sanitized["nested"]["source_url"] == "http://localhost:8000/api/analyze"
    assert sanitized["dataset_path"] == "data/raw/fake_job_postings.csv"
    assert sanitized["nested"]["corpus_path"] == "data/ai_corpus/ai_labeled_corpus.csv"

    # Regression check: Unfamiliar Windows absolute paths not matching repo folders are reduced to filename
    unfamiliar_windows_path = "C:\\Users\\Person\\Desktop\\secret\\file.txt"
    unfamiliar_payload = {
        "dataset_path": unfamiliar_windows_path,
        "nested": {
            "corpus_path": "C:\\External\\CustomData\\unrecognized_corpus.csv",
        },
    }
    sanitized_unfamiliar = _sanitize_public_payload(unfamiliar_payload)
    assert sanitized_unfamiliar["dataset_path"] == "file.txt"
    assert sanitized_unfamiliar["nested"]["corpus_path"] == "unrecognized_corpus.csv"
    assert_no_local_paths(sanitized_unfamiliar)
    assert _sanitize_path_value(unfamiliar_windows_path) == "file.txt"
    assert _sanitize_path_value("C:/Users/Person/Desktop/secret/file.txt") == "file.txt"
