# Recruitment Fraud Analyzer

A mini-project for analyzing whether a job posting appears fraudulent and whether it has AI-generated or AI-assisted writing traits. The project keeps the two signals independent: fraud likelihood and AI-generation likelihood are reported separately.

## Project structure

- `backend/`: FastAPI API and training logic
- `frontend/`: React + Vite dashboard and analyzer UI
- `extension/`: browser extension for job page analysis
- `data/demo/`: demonstration dataset for frontend and API testing
- `data/raw/`: place the real EMSCAD dataset here as `fake_job_postings.csv`
- `results/`: experiment outputs generated after real training

## Demo behavior

The project ships with a demonstration dataset in `data/demo/demo_jobs.csv`. The API reports `DEMO MODE` for these saved LogisticRegression pipelines. Demo probabilities, indicators, and metrics are workflow demonstrations only; they are not research results or estimates of real-world accuracy. SHAP is intentionally not reported for demo predictions.

## Real-data workflow

Place the EMSCAD file at `data/raw/fake_job_postings.csv` and then run:

```bash
cd backend
python -m app.train_models
```

This validates the CSV schema, requires a documented fraud label (`fraudulent`/`fraud_label`), extracts text/structured features, trains a fraud model with a held-out split, writes research metrics, and saves model metadata and artifacts. It refuses to fabricate labels. EMSCAD does not contain AI-generation labels; the separate controlled AI corpus is documented below and remains synthetic research data.

Research output is available at `/api/research-results` after training and includes dataset stats, split sizes, model type, confusion matrix, fraud-model metrics (Accuracy/Precision/Recall/F1/ROC-AUC/PR-AUC), and the separate AI-aware experiment.

## Run the backend

```bash
cd backend
python -m uvicorn app.api:app --host 0.0.0.0 --port 8000 --reload
```

## Run the frontend

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

The frontend expects the backend at `http://localhost:8000`.

## Notes

- AI-generated writing does not automatically imply fraud.
- The AI detector uses writing-style features and is intentionally separate from the fraud model.
- Research results are only shown when a real EMSCAD training run produced them.
- The browser extension is user-triggered. It does not mass-scrape, auto-apply, bypass CAPTCHAs, automate login, or bypass access controls.

## Browser extension

Load `extension/` from `chrome://extensions` with Developer mode enabled. The repository includes tested-by-inspection adapter code for LinkedIn, Indeed, and Glassdoor plus a generic fallback; selector changes on those sites can require maintenance. The popup extracts visible page content only after the user clicks **Analyze This Job**, permits review/editing through the backend/frontend workflows, and reports backend or extraction errors.

The popup now has an explicit review step: after extraction, edit title, company, location, salary, description, website, or application URL before sending the request.

## SHAP explainability

Research-mode fraud artifacts persist the transformed feature background needed for a genuine `shap.LinearExplainer` explanation of the trained logistic model. The API returns ranked feature contributions only when research artifacts exist and SHAP can run. Demo mode always returns `SHAP explanation unavailable in demo mode.`

## Independent AI-generation corpus

EMSCAD supplies the `fraudulent` label but has no AI-generation ground truth.
The project keeps EMSCAD unchanged and creates a separate controlled corpus with
`backend/app/create_ai_corpus.py`:

```bash
cd backend
python -m app.create_ai_corpus
```

The resulting `data/ai_corpus/ai_labeled_corpus.csv` contains four balanced,
provenance-labeled groups: AI-generated legitimate, AI-generated fraudulent,
human-authored legitimate, and human-authored fraudulent. Fraudulent groups are
synthetic scenarios, not real-world scam evidence. The AI classifier uses only
stylometric features from this separate corpus and never uses EMSCAD fraud labels
as AI labels.

The AI-aware experiment trains the AI classifier on its separate corpus, creates
signals for the EMSCAD train/test partitions, and compares baseline versus
AI-aware fraud models on the same held-out EMSCAD test set. Synthetic corpus
performance must not be generalized to all real-world AI-written postings.

## Commands

Backend:

```bash
cd backend
python -m uvicorn app.api:app --host 127.0.0.1 --port 8000 --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Tests and validation:

```bash
cd frontend
npm run build
cd ../backend
python -m pytest
```

Train with EMSCAD:

```bash
cd backend
python -m app.train_models ..\data\raw\fake_job_postings.csv
```
