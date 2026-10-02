from __future__ import annotations

import re
from pathlib import Path

import numpy as np
import pandas as pd

from .config import DEMO_DATA_PATH, EMSCAD_DATA_PATH


def normalize_text(value):
    if pd.isna(value):
        return ""
    value = str(value).strip()
    return re.sub(r"\s+", " ", value)


def safe_float(value):
    if pd.isna(value):
        return 0.0
    if isinstance(value, (int, float, np.integer, np.floating)):
        return float(value)
    text = str(value)
    numbers = re.findall(r"-?\d+(?:\.\d+)?", text)
    if numbers:
        return float(numbers[0])
    return 0.0


def load_dataset(dataset_path: str | Path | None = None) -> pd.DataFrame:
    path = Path(dataset_path) if dataset_path else (EMSCAD_DATA_PATH if EMSCAD_DATA_PATH.exists() else DEMO_DATA_PATH)
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found at {path}")

    df = pd.read_csv(path)
    return df.copy()


def validate_dataset_columns(df: pd.DataFrame) -> tuple[bool, list[str]]:
    required = ["title", "company", "description"]
    missing = [col for col in required if col not in df.columns]
    if not missing:
        return True, []
    return False, missing


def standardise_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    rename_map = {
        "job_title": "title",
        "job title": "title",
        "company_name": "company",
        "organization": "company",
        "company": "company",
        "job_description": "description",
        "description": "description",
        "salary_range": "salary",
        "salary": "salary",
        "location": "location",
        "email": "email",
        "website": "website",
        "application_url": "application_url",
        "employment_type": "employment_type",
        "experience": "experience",
        "requirements": "requirements",
        "benefits": "benefits",
        "is_fraud": "fraud_label",
        "fraudulent": "fraud_label",
        "fraud_label": "fraud_label",
        "is_ai": "ai_label",
        "ai_generated": "ai_label",
        "ai_label": "ai_label",
    }
    df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})

    for col in ["title", "company", "description", "salary", "location", "email", "website", "application_url", "employment_type", "experience", "requirements", "benefits"]:
        if col in df.columns:
            df[col] = df[col].map(normalize_text)
        else:
            df[col] = ""

    return df


def series_or_empty(df: pd.DataFrame, column: str) -> pd.Series:
    if column in df.columns:
        return df[column].fillna("").astype(str)
    return pd.Series([""] * len(df), index=df.index)


def compute_sentence_metrics(text: str):
    sentences = re.split(r"(?<=[.!?])\s+", text.strip()) if text.strip() else []
    lengths = [len(re.findall(r"\b\w+\b", s)) for s in sentences if s.strip()]
    if not lengths:
        return 0.0, 0.0, 0.0, 0.0
    mean_length = float(np.mean(lengths))
    std_length = float(np.std(lengths, ddof=0)) if len(lengths) > 1 else 0.0
    burstiness = float(np.std(lengths, ddof=0) / (mean_length + 1e-6)) if mean_length else 0.0
    return mean_length, std_length, burstiness, float(np.mean(lengths))


def compute_stylometric_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    title_series = series_or_empty(out, "title")
    description_series = series_or_empty(out, "description")
    requirements_series = series_or_empty(out, "requirements")
    benefits_series = series_or_empty(out, "benefits")
    out["combined_text"] = (
        title_series
        + " "
        + description_series
        + " "
        + requirements_series
        + " "
        + benefits_series
    )

    def sentence_stats(text: str):
        sentences = re.split(r"(?<=[.!?])\s+", text.strip()) if text.strip() else []
        lengths = [len(re.findall(r"\b\w+\b", s)) for s in sentences if s.strip()]
        if not lengths:
            return 0.0, 0.0, 0.0, 0.0
        mean_len = float(np.mean(lengths))
        std_len = float(np.std(lengths, ddof=0)) if len(lengths) > 1 else 0.0
        burst = std_len / (mean_len + 1e-6)
        return mean_len, std_len, burst, np.mean(lengths)

    def type_token_ratio(text: str):
        words = re.findall(r"\b\w+\b", text.lower())
        if not words:
            return 0.0
        return len(set(words)) / len(words)

    def punctuation_density(text: str):
        if not text:
            return 0.0
        punct = len(re.findall(r"[.,;:!?()\-—]", text))
        words = len(re.findall(r"\b\w+\b", text))
        return punct / (words + 1)

    out["sentence_length_mean"] = out["combined_text"].map(lambda x: sentence_stats(x)[0])
    out["sentence_length_variation"] = out["combined_text"].map(lambda x: sentence_stats(x)[1])
    out["sentence_burstiness"] = out["combined_text"].map(lambda x: sentence_stats(x)[2])
    out["type_token_ratio"] = out["combined_text"].map(type_token_ratio)
    out["punctuation_density"] = out["combined_text"].map(punctuation_density)
    out["avg_word_length"] = out["combined_text"].map(
        lambda x: np.mean([len(w) for w in re.findall(r"\b\w+\b", x.lower())]) if re.findall(r"\b\w+\b", x.lower()) else 0.0
    )
    out["readability_score"] = out["combined_text"].map(
        lambda x: (len(re.findall(r"\b\w+\b", x)) / (len(re.findall(r"(?<=[.!?])\s+", x)) + 1)) if x else 0.0
    )
    function_words = {"the", "and", "for", "with", "that", "this", "your", "are", "our", "we", "you", "a", "an", "to", "of", "in", "on"}
    out["function_word_rate"] = out["combined_text"].map(
        lambda x: sum(1 for w in re.findall(r"\b\w+\b", x.lower()) if w in function_words) / max(len(re.findall(r"\b\w+\b", x.lower())), 1)
    )
    out["n_gram_repetition_rate"] = out["combined_text"].map(
        lambda x: len(re.findall(r"\b(\w+\s+\w+)\b", x.lower())) / max(len(re.findall(r"\b\w+\b", x.lower())), 1)
    )
    out["unique_word_rate"] = out["combined_text"].map(
        lambda x: len(set(re.findall(r"\b\w+\b", x.lower()))) / max(len(re.findall(r"\b\w+\b", x.lower())), 1)
    )
    return out


def build_fraud_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    title_series = series_or_empty(out, "title")
    description_series = series_or_empty(out, "description")
    requirements_series = series_or_empty(out, "requirements")
    benefits_series = series_or_empty(out, "benefits")
    out["combined_text"] = title_series + " " + description_series + " " + requirements_series + " " + benefits_series
    out["salary_available"] = series_or_empty(out, "salary").map(lambda x: 1 if x.strip() else 0)
    out["company_info_present"] = out.apply(lambda row: 1 if (str(row.get("company", "")).strip() and str(row.get("website", "")).strip()) else 0, axis=1)
    out["has_questions"] = series_or_empty(out, "description").map(lambda x: 1 if "?" in x or "questions" in x.lower() else 0)
    out["telecommuting"] = series_or_empty(out, "description").map(lambda x: 1 if "remote" in x.lower() or "work from home" in x.lower() else 0)
    out["missing_field_count"] = out.apply(lambda row: sum(1 for col in ["company", "description", "location", "email", "website"] if not str(row.get(col, "")).strip()), axis=1)
    out["title_length"] = title_series.str.len()
    out["description_length"] = description_series.str.len()
    out["requirements_length"] = requirements_series.str.len()
    out["benefits_length"] = benefits_series.str.len()
    out["text_length"] = out["combined_text"].fillna("").astype(str).str.len()
    out["email_domain_free"] = series_or_empty(out, "email").map(lambda x: 1 if "gmail.com" in x.lower() or "yahoo.com" in x.lower() or "hotmail.com" in x.lower() else 0)
    out["suspicious_contact"] = out.apply(
        lambda row: 1 if any(token in str(row.get("description", "")).lower() for token in ["whatsapp", "telegram", "signal", "text me", "dm me", "pay on"] ) else 0,
        axis=1,
    )
    out["urgency_signal"] = out["description"].fillna("").astype(str).map(lambda x: 1 if any(token in x.lower() for token in ["urgent", "immediately", "hiring now", "limited seats", "fast interview"]) else 0)
    out["fee_signal"] = out["description"].fillna("").astype(str).map(lambda x: 1 if any(token in x.lower() for token in ["application fee", "registration fee", "pay fee", "pay upfront", "processing fee"]) else 0)
    out["sensitive_info_signal"] = out["description"].fillna("").astype(str).map(lambda x: 1 if any(token in x.lower() for token in ["bank details", "password", "ssn", "cvv", "routing number", "personal id"]) else 0)
    out["salary_pattern_suspicious"] = out["salary"].fillna("").astype(str).map(lambda x: 1 if re.search(r"\$\s*\d{3,}\s*[-–]\s*\$\s*\d{4,}", x) or re.search(r"\$\s*\d{4,}\s*per\s*day", x.lower()) else 0)
    out["employment_type"] = out.get("employment_type", pd.Series([""] * len(out))).fillna("").astype(str)
    out["location"] = out.get("location", pd.Series([""] * len(out))).fillna("").astype(str)
    out["company_domain"] = out.get("website", pd.Series([""] * len(out))).fillna("").astype(str).map(lambda x: x.split("//")[-1].split("/")[0].split(".")[-2] if x else "")
    return out


def prepare_prediction_row(payload: dict) -> pd.DataFrame:
    row = {
        "title": payload.get("title", ""),
        "company": payload.get("company", ""),
        "description": payload.get("description", ""),
        "salary": payload.get("salary", ""),
        "location": payload.get("location", ""),
        "email": payload.get("email", ""),
        "website": payload.get("website", ""),
        "application_url": payload.get("application_url", ""),
        "employment_type": payload.get("employment_type", ""),
        "experience": payload.get("experience", ""),
        "requirements": payload.get("requirements", ""),
        "benefits": payload.get("benefits", ""),
    }
    df = pd.DataFrame([row])
    return build_fraud_features(standardise_columns(df))
