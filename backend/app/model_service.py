
from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import (
    FunctionTransformer,
    OneHotEncoder,
    StandardScaler,
)

from .config import (
    AI_CORPUS_PATH,
    DEMO_DATA_PATH,
    EMSCAD_DATA_PATH,
    MODEL_DIR,
    RESULTS_DIR,
)
from .data_pipeline import (
    build_fraud_features,
    compute_stylometric_features,
    load_dataset,
    prepare_prediction_row,
    standardise_columns,
)


FRAUD_FEATURE_COLUMNS = [
    "combined_text",
    "salary_available",
    "company_info_present",
    "has_questions",
    "telecommuting",
    "missing_field_count",
    "title_length",
    "description_length",
    "requirements_length",
    "benefits_length",
    "text_length",
    "email_domain_free",
    "suspicious_contact",
    "urgency_signal",
    "fee_signal",
    "sensitive_info_signal",
    "salary_pattern_suspicious",
    "employment_type",
    "location",
    "company_domain",
]


AI_FEATURE_COLUMNS = [
    "sentence_length_mean",
    "sentence_length_variation",
    "sentence_burstiness",
    "type_token_ratio",
    "punctuation_density",
    "avg_word_length",
    "readability_score",
    "function_word_rate",
    "n_gram_repetition_rate",
    "unique_word_rate",
]


def reshape_single_column(values):
    return np.asarray(values).reshape(-1, 1)


def flatten_single_column(values):
    return np.asarray(values)[:, 0]


class FraudAIAnalyzer:
    """
    Fraud and AI-content analyzer.

    IMPORTANT:
    The production application does NOT train models during startup.

    Models are trained separately using train_models() and the resulting
    .joblib artifacts are loaded when the API starts.
    """

    def __init__(
        self,
        dataset_path: str | Path | None = None,
        auto_train: bool = False,
    ):
        selected = (
            Path(dataset_path)
            if dataset_path
            else (
                EMSCAD_DATA_PATH
                if EMSCAD_DATA_PATH.exists()
                else DEMO_DATA_PATH
            )
        )

        self.dataset_path = selected
        self.model_dir = MODEL_DIR
        self.results_dir = RESULTS_DIR

        self.metadata_path = self.model_dir / "model_metadata.json"
        self.shap_background_path = (
            self.model_dir / "fraud_shap_background.joblib"
        )

        self.fraud_model = None
        self.ai_model = None
        self.model_summary: dict = {}

        # Production startup only loads existing artifacts.
        # It NEVER trains unless auto_train=True is explicitly supplied.
        self._load_existing_models()

        if auto_train and self.fraud_model is None:
            self.train_models(self.dataset_path)

    # ------------------------------------------------------------------
    # MODEL LOADING
    # ------------------------------------------------------------------

    def _load_existing_models(self):
        """
        Load previously trained models without training anything.

        This method is intentionally lightweight so Render can start
        the FastAPI application without consuming huge amounts of RAM.
        """

        self.model_dir.mkdir(parents=True, exist_ok=True)
        self.results_dir.mkdir(parents=True, exist_ok=True)

        fraud_path = self.model_dir / "fraud_model.joblib"
        ai_path = self.model_dir / "ai_model.joblib"

        if not fraud_path.exists():
            self.model_summary = {
                "mode": "demo",
                "mode_label": "MODEL NOT LOADED",
                "dataset_path": str(self.dataset_path),
                "model_available": False,
                "message": (
                    "Fraud model artifact not found. "
                    "Train the model locally and deploy the generated "
                    "model artifacts."
                ),
            }
            return

        try:
            self.fraud_model = joblib.load(fraud_path)

            if ai_path.exists():
                self.ai_model = joblib.load(ai_path)

            if self.metadata_path.exists():
                self.model_summary = json.loads(
                    self.metadata_path.read_text(
                        encoding="utf-8"
                    )
                )

            # Make sure the API knows the models loaded successfully.
            self.model_summary["model_available"] = True

        except Exception as error:
            self.fraud_model = None
            self.ai_model = None

            self.model_summary = {
                "mode": "demo",
                "mode_label": "MODEL LOAD ERROR",
                "dataset_path": str(self.dataset_path),
                "model_available": False,
                "load_error": str(error),
            }

    # ------------------------------------------------------------------
    # TRAINING HELPERS
    # ------------------------------------------------------------------

    @staticmethod
    def _resolve_target(df: pd.DataFrame, target_name: str):
        aliases = {
            "fraud_label": [
                "fraud_label",
                "fraudulent",
                "is_fraud",
                "label",
                "fraud",
            ],
            "ai_label": [
                "ai_label",
                "ai_generated",
                "is_ai",
                "ai",
                "generated",
            ],
        }

        for possible_name in aliases[target_name]:
            if possible_name in df.columns:
                return possible_name

        return None

    def _build_fraud_pipeline(
        self,
        include_ai_signal: bool = False,
    ) -> Pipeline:

        numeric_columns = [
            "salary_available",
            "company_info_present",
            "has_questions",
            "telecommuting",
            "missing_field_count",
            "title_length",
            "description_length",
            "requirements_length",
            "benefits_length",
            "text_length",
            "email_domain_free",
            "suspicious_contact",
            "urgency_signal",
            "fee_signal",
            "sensitive_info_signal",
            "salary_pattern_suspicious",
        ]

        if include_ai_signal:
            numeric_columns.append("ai_signal")

        categorical_columns = [
            "employment_type",
            "location",
            "company_domain",
        ]

        text_preprocess = Pipeline(
            [
                (
                    "reshape",
                    FunctionTransformer(
                        reshape_single_column,
                        validate=False,
                    ),
                ),
                (
                    "imputer",
                    SimpleImputer(
                        strategy="constant",
                        fill_value="",
                    ),
                ),
                (
                    "flatten",
                    FunctionTransformer(
                        flatten_single_column,
                        validate=False,
                    ),
                ),
                (
                    "tfidf",
                    TfidfVectorizer(
                        ngram_range=(1, 2),
                        min_df=3,
                        strip_accents="unicode",
                        max_features=6000,
                    ),
                ),
            ]
        )

        preprocessor = ColumnTransformer(
            [
                (
                    "text",
                    text_preprocess,
                    ["combined_text"],
                ),
                (
                    "numeric",
                    Pipeline(
                        [
                            (
                                "imputer",
                                SimpleImputer(strategy="median"),
                            ),
                            (
                                "scaler",
                                StandardScaler(),
                            ),
                        ]
                    ),
                    numeric_columns,
                ),
                (
                    "categorical",
                    Pipeline(
                        [
                            (
                                "imputer",
                                SimpleImputer(
                                    strategy="most_frequent"
                                ),
                            ),
                            (
                                "onehot",
                                OneHotEncoder(
                                    handle_unknown="ignore"
                                ),
                            ),
                        ]
                    ),
                    categorical_columns,
                ),
            ],
            remainder="drop",
        )

        return Pipeline(
            [
                ("preprocessor", preprocessor),
                (
                    "classifier",
                    LogisticRegression(
                        max_iter=4000,
                        class_weight="balanced",
                    ),
                ),
            ]
        )

    def _build_ai_pipeline(self) -> Pipeline:
        preprocessor = ColumnTransformer(
            [
                (
                    "numeric",
                    Pipeline(
                        [
                            (
                                "imputer",
                                SimpleImputer(strategy="median"),
                            ),
                            (
                                "scaler",
                                StandardScaler(),
                            ),
                        ]
                    ),
                    AI_FEATURE_COLUMNS,
                ),
            ],
            remainder="drop",
        )

        return Pipeline(
            [
                ("preprocessor", preprocessor),
                (
                    "classifier",
                    LogisticRegression(
                        max_iter=4000,
                        class_weight="balanced",
                    ),
                ),
            ]
        )

    @staticmethod
    def _metric_summary(
        probabilities: np.ndarray,
        labels: pd.Series,
    ):
        predictions = (
            np.asarray(probabilities) >= 0.5
        ).astype(int)

        return {
            "accuracy": round(
                float(
                    accuracy_score(
                        labels,
                        predictions,
                    )
                ),
                4,
            ),
            "precision": round(
                float(
                    precision_score(
                        labels,
                        predictions,
                        zero_division=0,
                    )
                ),
                4,
            ),
            "recall": round(
                float(
                    recall_score(
                        labels,
                        predictions,
                        zero_division=0,
                    )
                ),
                4,
            ),
            "f1": round(
                float(
                    f1_score(
                        labels,
                        predictions,
                        zero_division=0,
                    )
                ),
                4,
            ),
            "roc_auc": round(
                float(
                    roc_auc_score(
                        labels,
                        probabilities,
                    )
                ),
                4,
            ),
            "pr_auc": round(
                float(
                    average_precision_score(
                        labels,
                        probabilities,
                    )
                ),
                4,
            ),
            "confusion_matrix": confusion_matrix(
                labels,
                predictions,
                labels=[0, 1],
            ).tolist(),
        }

    @staticmethod
    def _fraud_feature_names(
        fraud_pipeline: Pipeline,
    ):
        preprocessor = fraud_pipeline.named_steps[
            "preprocessor"
        ]

        text_names = [
            f"text__{name}"
            for name in (
                preprocessor
                .named_transformers_["text"]
                .named_steps["tfidf"]
                .get_feature_names_out()
            )
        ]

        numeric_names = [
            "numeric__salary_available",
            "numeric__company_info_present",
            "numeric__has_questions",
            "numeric__telecommuting",
            "numeric__missing_field_count",
            "numeric__title_length",
            "numeric__description_length",
            "numeric__requirements_length",
            "numeric__benefits_length",
            "numeric__text_length",
            "numeric__email_domain_free",
            "numeric__suspicious_contact",
            "numeric__urgency_signal",
            "numeric__fee_signal",
            "numeric__sensitive_info_signal",
            "numeric__salary_pattern_suspicious",
        ]

        if "ai_signal" in (
            preprocessor
            .named_transformers_["numeric"]
            .named_steps["imputer"]
            .feature_names_in_
            if hasattr(
                preprocessor
                .named_transformers_["numeric"]
                .named_steps["imputer"],
                "feature_names_in_",
            )
            else []
        ):
            numeric_names.append("numeric__ai_signal")

        cat_encoder = (
            preprocessor
            .named_transformers_["categorical"]
            .named_steps["onehot"]
        )

        categorical_names = [
            f"categorical__{name}"
            for name in cat_encoder.get_feature_names_out(
                [
                    "employment_type",
                    "location",
                    "company_domain",
                ]
            )
        ]

        return (
            text_names
            + numeric_names
            + categorical_names
        )

    # ------------------------------------------------------------------
    # DATA PREPARATION
    # ------------------------------------------------------------------

    def _prepare_training_frame(
        self,
        dataset_path: str | Path | None = None,
    ):
        raw = load_dataset(
            dataset_path or self.dataset_path
        )

        standard = standardise_columns(raw)

        fraud_target_name = self._resolve_target(
            standard,
            "fraud_label",
        )

        if fraud_target_name is None:
            raise ValueError(
                "Training requires a documented fraud label "
                "column (fraudulent/fraud_label)."
            )

        if standard[fraud_target_name].isna().any():
            raise ValueError(
                "Fraud labels must not contain missing values."
            )

        try:
            standard["fraud_label"] = (
                standard[fraud_target_name].astype(int)
            )
        except (TypeError, ValueError) as error:
            raise ValueError(
                "Fraud labels must be binary integers (0 or 1)."
            ) from error

        if not set(
            standard["fraud_label"]
            .dropna()
            .unique()
        ).issubset({0, 1}):
            raise ValueError(
                "Fraud labels must contain only 0/1."
            )

        ai_target_name = self._resolve_target(
            standard,
            "ai_label",
        )

        ai_available = False

        if (
            ai_target_name is not None
            and not standard[ai_target_name].isna().any()
        ):
            casted = pd.to_numeric(
                standard[ai_target_name],
                errors="coerce",
            )

            if (
                casted.notna().all()
                and set(
                    casted.astype(int).unique()
                ).issubset({0, 1})
            ):
                standard["ai_label"] = (
                    casted.astype(int)
                )
                ai_available = True

        enriched = compute_stylometric_features(
            build_fraud_features(standard)
        )

        return raw, enriched, ai_available

    def _load_ai_corpus(self):
        if not AI_CORPUS_PATH.exists():
            return None

        corpus = pd.read_csv(AI_CORPUS_PATH)

        required = {
            "description",
            "title",
            "fraudulent",
            "ai_generated",
            "generation_method",
            "provenance",
        }

        missing = required.difference(
            corpus.columns
        )

        if missing:
            raise ValueError(
                "AI corpus is missing required columns: "
                f"{sorted(missing)}"
            )

        labels = corpus[
            ["fraudulent", "ai_generated"]
        ].apply(
            pd.to_numeric,
            errors="coerce",
        )

        if (
            labels.isna().any().any()
            or not labels.isin([0, 1]).all().all()
        ):
            raise ValueError(
                "AI corpus labels must be "
                "non-missing binary values."
            )

        frame = standardise_columns(
            corpus.rename(
                columns={
                    "fraudulent": "fraud_label",
                    "ai_generated": "ai_label",
                }
            )
        )

        return (
            compute_stylometric_features(
                build_fraud_features(frame)
            ),
            corpus,
        )

    def _train_ai_corpus_model(self):
        loaded = self._load_ai_corpus()

        if loaded is None:
            return None, {
                "available": False,
                "reason": (
                    "Not available — create the separate "
                    "AI-labeled corpus first."
                ),
                "metrics": None,
            }

        corpus, raw_corpus = loaded

        ai_x = corpus[AI_FEATURE_COLUMNS]
        ai_y = corpus["ai_label"].astype(int)

        train_idx, test_idx = train_test_split(
            corpus.index,
            test_size=0.25,
            random_state=42,
            stratify=ai_y,
        )

        model = self._build_ai_pipeline()

        model.fit(
            ai_x.loc[train_idx],
            ai_y.loc[train_idx],
        )

        metrics = self._metric_summary(
            model.predict_proba(
                ai_x.loc[test_idx]
            )[:, 1],
            ai_y.loc[test_idx],
        )

        joblib.dump(
            model,
            self.model_dir / "ai_model.joblib",
        )

        groups = raw_corpus.groupby(
            [
                "ai_generated",
                "fraudulent",
            ]
        ).size().to_dict()

        return model, {
            "available": True,
            "reason": None,
            "corpus_path": str(AI_CORPUS_PATH),
            "corpus_type": "Synthetic research corpus",
            "corpus_rows": int(len(raw_corpus)),
            "category_counts": {
                "ai_generated_legitimate": int(
                    groups.get((1, 0), 0)
                ),
                "ai_generated_fraudulent": int(
                    groups.get((1, 1), 0)
                ),
                "human_written_legitimate": int(
                    groups.get((0, 0), 0)
                ),
                "human_written_fraudulent": int(
                    groups.get((0, 1), 0)
                ),
            },
            "split": {
                "train_size": len(train_idx),
                "test_size": len(test_idx),
                "random_seed": 42,
            },
            "metrics": metrics,
        }

    # ------------------------------------------------------------------
    # TRAINING
    # ------------------------------------------------------------------

    def train_models(
        self,
        dataset_path: str | Path | None = None,
    ):
        """
        Explicit training method.

        Run this locally when you actually want to retrain models.
        It is NOT called automatically by the API server.
        """

        source = Path(
            dataset_path or self.dataset_path
        )

        raw_df, df, _ = (
            self._prepare_training_frame(source)
        )

        train_df = df[
            df["fraud_label"].isin([0, 1])
        ].copy()

        if len(train_df) < 100:
            raise ValueError(
                "Not enough records to train a real "
                "fraud model."
            )

        X = train_df[
            FRAUD_FEATURE_COLUMNS
        ]

        y = train_df[
            "fraud_label"
        ].astype(int)

        X_train, X_test, y_train, y_test = (
            train_test_split(
                X,
                y,
                test_size=0.2,
                random_state=42,
                stratify=y,
            )
        )

        fraud_pipeline = (
            self._build_fraud_pipeline()
        )

        fraud_pipeline.fit(
            X_train,
            y_train,
        )

        fraud_test_probabilities = (
            fraud_pipeline
            .predict_proba(X_test)[:, 1]
        )

        fraud_metrics = (
            self._metric_summary(
                fraud_test_probabilities,
                y_test,
            )
        )

        # Keep SHAP background small to reduce memory.
        transformed_train = (
            fraud_pipeline
            .named_steps["preprocessor"]
            .transform(X_train)
        )

        if hasattr(
            transformed_train,
            "toarray",
        ):
            transformed_train = (
                transformed_train.toarray()
            )

        shap_background = np.asarray(
            transformed_train[
                : min(
                    50,
                    len(transformed_train),
                )
            ],
            dtype=np.float32,
        )

        self.ai_model, ai_metadata = (
            self._train_ai_corpus_model()
        )

        ai_path = (
            self.model_dir
            / "ai_model.joblib"
        )

        if (
            not ai_metadata["available"]
            and ai_path.exists()
        ):
            ai_path.unlink()

        ai_aware_metadata = {
            "available": False,
            "reason": (
                "Not available — AI-labeled "
                "dataset required."
            ),
        }

        if self.ai_model is not None:
            ai_train_signal = (
                self.ai_model
                .predict_proba(
                    train_df.loc[
                        X_train.index,
                        AI_FEATURE_COLUMNS,
                    ]
                )[:, 1]
            )

            ai_test_signal = (
                self.ai_model
                .predict_proba(
                    train_df.loc[
                        X_test.index,
                        AI_FEATURE_COLUMNS,
                    ]
                )[:, 1]
            )

            aware_train = X_train.copy()
            aware_test = X_test.copy()

            aware_train[
                "ai_signal"
            ] = ai_train_signal

            aware_test[
                "ai_signal"
            ] = ai_test_signal

            aware_model = (
                self._build_fraud_pipeline(
                    include_ai_signal=True
                )
            )

            aware_model.fit(
                aware_train,
                y_train,
            )

            ai_aware_metadata = {
                "available": True,
                "metrics": self._metric_summary(
                    aware_model.predict_proba(
                        aware_test
                    )[:, 1],
                    y_test,
                ),
                "difference": {},
            }

            for metric in (
                "accuracy",
                "precision",
                "recall",
                "f1",
                "roc_auc",
                "pr_auc",
            ):
                ai_aware_metadata[
                    "difference"
                ][metric] = round(
                    ai_aware_metadata[
                        "metrics"
                    ][metric]
                    - fraud_metrics[metric],
                    4,
                )

        fraud_model_path = (
            self.model_dir
            / "fraud_model.joblib"
        )

        joblib.dump(
            fraud_pipeline,
            fraud_model_path,
            compress=3,
        )

        self.fraud_model = fraud_pipeline

        mode = (
            "research"
            if source.resolve()
            == EMSCAD_DATA_PATH.resolve()
            else "demo"
        )

        duplicate_count = int(
            raw_df.duplicated().sum()
        )

        missing_values = int(
            raw_df.isna().sum().sum()
        )

        fraud_samples = int(
            (
                train_df["fraud_label"]
                == 1
            ).sum()
        )

        legitimate_samples = int(
            (
                train_df["fraud_label"]
                == 0
            ).sum()
        )

        joblib.dump(
            shap_background,
            self.shap_background_path,
            compress=3,
        )

        metadata = {
            "mode": mode,
            "mode_label": (
                "RESEARCH MODE"
                if mode == "research"
                else "DEMO MODE"
            ),
            "model_available": True,
            "dataset_path": str(source),
            "dataset_rows": int(
                len(raw_df)
            ),
            "dataset_columns": (
                raw_df.columns.tolist()
            ),
            "duplicate_rows": duplicate_count,
            "missing_values": missing_values,
            "fraud_samples": fraud_samples,
            "legitimate_samples": legitimate_samples,
            "fraud_rate": round(
                float(
                    fraud_samples
                    / max(
                        len(train_df),
                        1,
                    )
                ),
                4,
            ),
            "split": {
                "train_size": int(
                    len(X_train)
                ),
                "test_size": int(
                    len(X_test)
                ),
                "random_seed": 42,
            },
            "fraud_model": {
                "type": (
                    "LogisticRegression + "
                    "TF-IDF + structured features"
                ),
                "metrics": fraud_metrics,
            },
            "ai_model": ai_metadata,
            "ai_aware_experiments": (
                ai_aware_metadata
            ),
            "shap": {
                "background_path": str(
                    self.shap_background_path
                ),
                "feature_count": len(
                    self._fraud_feature_names(
                        fraud_pipeline
                    )
                ),
            },
            "timestamp_utc": (
                pd.Timestamp.now("UTC")
                .isoformat()
            ),
        }

        self.model_summary = metadata

        self.metadata_path.write_text(
            json.dumps(
                metadata,
                indent=2,
            ),
            encoding="utf-8",
        )

        (
            self.results_dir
            / "research_results.json"
        ).write_text(
            json.dumps(
                metadata,
                indent=2,
            ),
            encoding="utf-8",
        )

        (
            self.results_dir
            / "experiment_summary.json"
        ).write_text(
            json.dumps(
                metadata,
                indent=2,
            ),
            encoding="utf-8",
        )

        return metadata

    # ------------------------------------------------------------------
    # RISK / INDICATORS
    # ------------------------------------------------------------------

    def _risk_level(
        self,
        probability: float,
    ):
        if probability >= 0.75:
            return "HIGH"

        if probability >= 0.45:
            return "MEDIUM"

        return "LOW"

    def _rule_based_fraud_indicators(
        self,
        row: pd.Series,
    ):
        signals = []

        text = (
            str(row.get("description", ""))
            + " "
            + str(row.get("title", ""))
        ).lower()

        if row.get("fee_signal", 0):
            signals.append(
                "Application or registration fee mentioned"
            )

        if row.get(
            "sensitive_info_signal",
            0,
        ):
            signals.append(
                "Request for sensitive or personal information"
            )

        if row.get(
            "suspicious_contact",
            0,
        ):
            signals.append(
                "Suspicious off-platform contact requested"
            )

        if row.get(
            "urgency_signal",
            0,
        ):
            signals.append(
                "Urgency language detected"
            )

        if row.get(
            "email_domain_free",
            0,
        ):
            signals.append(
                "Free email domain used"
            )

        if row.get(
            "salary_pattern_suspicious",
            0,
        ):
            signals.append(
                "Unrealistic salary pattern"
            )

        if any(
            token in text
            for token in [
                "whatsapp",
                "telegram",
                "signal",
                "chat on whatsapp",
            ]
        ):
            signals.append(
                "Contact requests moved off the official platform"
            )

        if not signals:
            signals.append(
                "No strong fraud indicators were detected"
            )

        return signals[:6]

    def _ai_indicators(
        self,
        row: pd.Series,
    ):
        if not self.model_summary.get(
            "ai_model",
            {},
        ).get("available"):
            return [
                "Not available — AI-labeled dataset required."
            ]

        signals = []

        if row.get(
            "sentence_burstiness",
            0,
        ) < 0.6:
            signals.append(
                "Low sentence variation may indicate template-like text"
            )

        if row.get(
            "type_token_ratio",
            0,
        ) < 0.35:
            signals.append(
                "Lower lexical diversity than expected for natural prose"
            )

        if row.get(
            "n_gram_repetition_rate",
            0,
        ) > 0.5:
            signals.append(
                "Repeated phrasing may signal AI-assisted drafting"
            )

        if not signals:
            signals.append(
                "No strong AI-style indicators were detected"
            )

        return signals[:5]

    @staticmethod
    def _build_autopsy(payload: dict, fraud_indicators: list[str], ai_indicators: list[str], shap: dict, risk_level: str):
        """Turn existing model output and supplied fields into a transparent report."""
        normalized = lambda value: " ".join(str(value or "").casefold().split())
        salary = str(payload.get("salary", "")).strip()
        salary_text = salary.casefold()
        has_range = bool(re.search(r"\d[^\n]{0,35}(?:-|–|—|\bto\b)[^\n]{0,35}\d", salary_text))
        currency = next((label for token, label in (("₹", "INR"), ("inr", "INR"), ("$", "USD"), ("usd", "USD"), ("€", "EUR"), ("eur", "EUR"), ("£", "GBP"), ("gbp", "GBP")) if token in salary_text), None)
        suspicious_salary = any("salary" in signal.casefold() or "unrealistic salary" in signal.casefold() for signal in fraud_indicators)
        salary_report = {
            "status": "stated" if salary else "not_stated",
            "listed_value": salary or None,
            "format": "range" if salary and has_range else ("stated amount" if salary else None),
            "currency": currency,
            "flagged_by_existing_signal": suspicious_salary,
            "benchmark": None,
            "note": "No external salary benchmark is configured; no market range is inferred." if salary else "Salary was not present in the supplied posting.",
        }

        missing = [label for key, label in (("company", "Company name"), ("website", "Company website"), ("description", "Job description"), ("salary", "Salary"), ("application_url", "Application route"), ("email", "Contact email")) if not str(payload.get(key, "")).strip()]
        fee_detected = any("fee" in signal.casefold() for signal in fraud_indicators)
        safety = [
            {"item": "Company information", "status": "present" if payload.get("company") and payload.get("website") else "incomplete", "detail": "Name and website fields supplied; identity is not independently verified." if payload.get("company") and payload.get("website") else "Company name or website field is missing."},
            {"item": "Job details", "status": "present" if payload.get("description") else "incomplete", "detail": "Description supplied." if payload.get("description") else "Description is missing."},
            {"item": "Salary transparency", "status": "present" if salary else "incomplete", "detail": "Salary supplied; no market benchmark was available." if salary else "No salary supplied."},
            {"item": "Application route", "status": "present" if payload.get("application_url") else "incomplete", "detail": "Application URL supplied." if payload.get("application_url") else "Application URL is missing."},
            {"item": "Contact details", "status": "present" if payload.get("email") else "incomplete", "detail": "Contact email supplied." if payload.get("email") else "No contact email supplied."},
            {"item": "Upfront fee request", "status": "risk" if fee_detected else "clear", "detail": "Existing fraud rules detected fee-related language." if fee_detected else "No fee request detected by existing rules."},
        ]

        comparisons = []
        for source in payload.get("comparison_sources", [])[:5]:
            if hasattr(source, "model_dump"):
                source = source.model_dump()
            differences = []
            for key, label in (("title", "Job title"), ("company", "Company"), ("location", "Location"), ("salary", "Salary")):
                left, right = normalized(payload.get(key)), normalized(source.get(key))
                if left and right and left != right:
                    differences.append({"field": label, "primary": str(payload.get(key)), "other": str(source.get(key))})
            comparisons.append({"platform": source.get("platform") or "Other source", "url": source.get("url") or None, "differences": differences, "status": "mismatch" if differences else "consistent" if any(source.get(key) and payload.get(key) for key in ("title", "company", "location", "salary")) else "insufficient_data", "method": "Supplied text is compared after case and whitespace normalization; salary units and currencies are not converted."})

        evidence_nodes = [{"kind": "posting", "label": str(payload.get("title") or "Job posting"), "detail": str(payload.get("company") or "Company not supplied")}]
        for signal in fraud_indicators:
            evidence_nodes.append({"kind": "fraud_signal", "label": signal, "detail": "Rule-based posting evidence", "severity": "high" if any(term in signal.casefold() for term in ("fee", "sensitive", "unrealistic salary")) else "review"})
        for signal in ai_indicators:
            evidence_nodes.append({"kind": "writing_signal", "label": signal, "detail": "Writing-style signal; independent of fraud assessment"})
        if shap.get("available"):
            evidence_nodes.extend({"kind": "model_contribution", "label": str(item.get("feature", "Model feature")), "detail": f"SHAP contribution {item.get('value')}"} for item in shap.get("features", [])[:5])
        evidence_nodes.append({"kind": "assessment", "label": f"{risk_level} fraud risk", "detail": "Model probability is a decision-support signal, not proof."})

        final_node = len(evidence_nodes) - 1
        edges = [{"from": 0, "to": index} for index in range(1, final_node)]
        edges.extend({"from": index, "to": final_node} for index in range(1, final_node))
        edges.append({"from": 0, "to": final_node})
        return {"salary": salary_report, "safety": safety, "missing_information": missing, "comparisons": comparisons, "evidence_graph": {"nodes": evidence_nodes, "edges": edges}, "summary": f"{risk_level} fraud risk from the existing model, with {len(fraud_indicators)} fraud indicator(s) and {len(missing)} missing information item(s)."}

    # ------------------------------------------------------------------
    # SHAP
    # ------------------------------------------------------------------

    def _shap_explanation(
        self,
        fraud_features: pd.DataFrame,
    ):
        if (
            self.model_summary.get("mode")
            != "research"
        ):
            return {
                "available": False,
                "message": (
                    "SHAP explanation unavailable "
                    "in demo mode."
                ),
                "features": [],
            }

        if not self.shap_background_path.exists():
            return {
                "available": False,
                "message": (
                    "SHAP background artifact not found."
                ),
                "features": [],
            }

        try:
            import shap

            transformed = (
                self.fraud_model
                .named_steps["preprocessor"]
                .transform(fraud_features)
            )

            if hasattr(
                transformed,
                "toarray",
            ):
                transformed = transformed.toarray()

            background = np.asarray(
                joblib.load(
                    self.shap_background_path
                ),
                dtype=np.float32,
            )

            explainer = shap.LinearExplainer(
                self.fraud_model
                .named_steps["classifier"],
                background,
            )

            shap_values = explainer.shap_values(
                np.asarray(
                    transformed,
                    dtype=np.float32,
                )
            )

            if isinstance(
                shap_values,
                list,
            ):
                shap_values = shap_values[-1]

            names = self._fraud_feature_names(
                self.fraud_model
            )

            values = np.asarray(
                shap_values
            )[0]

            ranked = sorted(
                [
                    {
                        "feature": name,
                        "value": round(
                            float(value),
                            6,
                        ),
                    }
                    for name, value in zip(
                        names,
                        values,
                    )
                ],
                key=lambda item: abs(
                    item["value"]
                ),
                reverse=True,
            )

            return {
                "available": True,
                "message": (
                    "SHAP contributions from "
                    "the trained fraud model."
                ),
                "features": ranked[:12],
            }

        except Exception as error:
            return {
                "available": False,
                "message": (
                    f"SHAP explanation unavailable: {error}"
                ),
                "features": [],
            }

    # ------------------------------------------------------------------
    # API INFORMATION
    # ------------------------------------------------------------------

    def get_model_info(self):
        return {
            "mode": self.model_summary.get(
                "mode_label",
                "MODEL NOT LOADED",
            ),
            "model_available": bool(
                self.fraud_model is not None
            ),
            "dataset_path": self.model_summary.get(
                "dataset_path",
                str(self.dataset_path),
            ),
            "dataset_rows": self.model_summary.get(
                "dataset_rows"
            ),
            "fraud_samples": self.model_summary.get(
                "fraud_samples"
            ),
            "legitimate_samples": self.model_summary.get(
                "legitimate_samples"
            ),
            "fraud_rate": self.model_summary.get(
                "fraud_rate"
            ),
            "training_source": self.model_summary.get(
                "mode",
                "demo",
            ),
            "platform_adapters": [
                "linkedin",
                "indeed",
                "glassdoor",
                "naukri",
                "generic",
            ],
            "research_dashboard": {
                "available": (
                    self.model_summary.get(
                        "mode"
                    )
                    == "research"
                ),
                "status": (
                    "Research artifacts available."
                    if self.model_summary.get(
                        "mode"
                    )
                    == "research"
                    else "Demo artifacts are not research results."
                ),
            },
            "ai_model": self.model_summary.get(
                "ai_model"
            ),
            "fraud_model": self.model_summary.get(
                "fraud_model"
            ),
            "ai_aware_experiments": (
                self.model_summary.get(
                    "ai_aware_experiments"
                )
            ),
        }

    def get_research_results(self):
        if (
            self.model_summary.get("mode")
            != "research"
        ):
            return {
                "available": False,
                "status": (
                    "Research results unavailable. "
                    "Provide the required dataset "
                    "and run training."
                ),
                "ai_aware_experiments": (
                    "Not available — AI-labeled "
                    "dataset required."
                ),
            }

        payload = dict(
            self.model_summary
        )

        payload.pop("shap", None)

        return {
            "available": True,
            **payload,
        }

    # ------------------------------------------------------------------
    # PREDICTION
    # ------------------------------------------------------------------

    def predict(
        self,
        payload: dict,
    ):
        """
        Analyze one job posting.

        IMPORTANT:
        This method never trains a model.
        """

        if self.fraud_model is None:
            raise RuntimeError(
                "Fraud model is not available. "
                "Train the model locally and deploy "
                "models/fraud_model.joblib."
            )

        prepared = (
            prepare_prediction_row(
                payload
            ).fillna(0)
        )

        fraud_features = prepared[
            FRAUD_FEATURE_COLUMNS
        ]

        fraud_prob = float(
            self.fraud_model
            .predict_proba(
                fraud_features
            )[0, 1]
        )

        ai_available = (
            bool(
                self.model_summary
                .get(
                    "ai_model",
                    {},
                )
                .get(
                    "available"
                )
            )
            and self.ai_model is not None
        )

        ai_prob = None

        if ai_available:
            ai_record = (
                compute_stylometric_features(
                    standardise_columns(
                        pd.DataFrame(
                            [payload]
                        )
                    )
                ).iloc[0]
            )

            ai_features = pd.DataFrame(
                [
                    {
                        column: float(
                            ai_record.get(
                                column,
                                0.0,
                            )
                        )
                        for column in AI_FEATURE_COLUMNS
                    }
                ]
            )

            ai_prob = float(
                self.ai_model
                .predict_proba(
                    ai_features
                )[0, 1]
            )

        row = prepared.iloc[0]
        fraud_indicators = self._rule_based_fraud_indicators(row)
        ai_indicators = self._ai_indicators(row)
        shap = self._shap_explanation(fraud_features)
        risk_level = self._risk_level(fraud_prob)

        return {
            "fraud_probability": round(
                fraud_prob,
                4,
            ),
            "ai_generation_probability": (
                round(
                    ai_prob,
                    4,
                )
                if ai_prob is not None
                else None
            ),
            "risk_level": risk_level,
            "fraud_indicators": fraud_indicators,
            "ai_indicators": ai_indicators,
            "explanation": {
                "fraud_probability": round(
                    fraud_prob,
                    4,
                ),
                "ai_generation_probability": (
                    round(
                        ai_prob,
                        4,
                    )
                    if ai_prob is not None
                    else None
                ),
                "note": (
                    "AI-generated content does not "
                    "inherently indicate fraudulent intent."
                ),
                "ai_status": (
                    self.model_summary
                    .get(
                        "ai_model",
                        {},
                    )
                    .get(
                        "reason"
                    )
                ),
            },
            "shap": shap,
            "autopsy": self._build_autopsy(payload, fraud_indicators, ai_indicators, shap, risk_level),
            "mode": self.model_summary.get(
                "mode_label",
                "DEMO MODE",
            ),
            "disclaimer": (
                "Model outputs are decision-support "
                "signals and not definitive proof of fraud."
            ),
        }


# ----------------------------------------------------------------------
# GLOBAL ANALYZER
# ----------------------------------------------------------------------
#
# CRITICAL:
# auto_train=False means Render will NOT train the 17,880-row dataset
# while importing this module.
#
# It only loads the already-created .joblib model.
#
analyzer = FraudAIAnalyzer(
    auto_train=False
)
