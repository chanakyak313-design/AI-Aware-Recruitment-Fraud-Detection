# AI-Aware Recruitment Fraud Detection

**Separate suspicious intent from AI-assisted writing.** This project analyzes job postings for two distinct signals: potential recruitment fraud and AI-generated or AI-assisted writing traits. The signals are reported independently; polished or AI-written copy is not, by itself, evidence of fraud.

> **Research and demonstration project.** Predictions are screening signals for human review, not a definitive finding that a posting or employer is fraudulent.

## Overview

Online job seekers can encounter misleading or fraudulent postings, while legitimate employers increasingly use AI tools to draft job descriptions. Treating AI use as a fraud indicator would conflate writing style with intent. This project keeps those questions separate and brings the available evidence into one analysis workflow.

The repository contains a FastAPI backend, a React and Vite interface, a Chrome extension, demo data, and scripts for training and research experiments. The shipped demo uses saved LogisticRegression pipelines and is intended to demonstrate the workflow. Its probabilities, indicators, and metrics are not estimates of real-world model performance.

## Features

- **Fraud-risk analysis:** Scores a posting using the fraud model and available posting fields.
- **AI-writing analysis:** Reports a separate writing-style signal; AI authorship does not imply fraudulent intent.
- **Job Autopsy:** Combines the supplied posting and available fraud, AI-writing, and SHAP outputs into an evidence graph and structured report.
- **SHAP explanations:** Provides ranked feature contributions when trained research artifacts are available and SHAP can run.
- **Salary intelligence and safety checks:** Reports salary presence, format, and currency, along with pre-application completeness checks and missing supplied details. It does not invent a salary benchmark.
- **Cross-source comparison:** Compares user-provided listing details across sources, including title, company, location, and salary. Comparisons normalize case and whitespace; salary units and currencies are not converted.
- **Chrome extension:** Extracts visible page content only after the user requests analysis. The popup allows review and editing before submission.
- **Research results:** After a real training run, the API can expose dataset and split statistics, a confusion matrix, fraud-model evaluation metrics, and the separate AI-aware experiment.

## How it works

### Analysis pipeline

1. A user enters a posting in the dashboard or chooses **Analyze This Job** in the extension.
2. The extension extracts visible content from the current page and presents it for review. Users can edit the title, company, location, salary, description, website, and application URL.
3. The frontend sends the supplied posting to the FastAPI backend.
4. The backend runs the available fraud and AI-writing analyses separately and assembles an autopsy with the evidence and safety information available for that posting.
5. The interface presents the results, evidence graph, and optional cross-source comparison details for human review.

The extension includes adapters for LinkedIn, Indeed, and Glassdoor, plus a generic fallback. Site markup changes can require selector maintenance.

### Fraud model and dataset

The real-data workflow uses the EMSCAD dataset, supplied locally as `data/raw/fake_job_postings.csv`. Training validates the input schema and requires a documented fraud label (`fraudulent` or `fraud_label`); it does not fabricate labels. The training script extracts text and structured features, trains a fraud model with a held-out split, and writes model artifacts and research metrics.

The repository does not include a real-data performance claim in this README. Research metrics become available through `/api/research-results` only after a real training run. Reported fraud metrics include Accuracy, Precision, Recall, F1, ROC-AUC, and PR-AUC, along with split sizes and a confusion matrix.

### AI-generation analysis

EMSCAD provides fraud labels but has no AI-generation ground truth. The project therefore keeps EMSCAD unchanged and creates a separate controlled AI corpus with `backend/app/create_ai_corpus.py`. It contains four provenance-labeled groups:

- AI-generated legitimate
- AI-generated fraudulent
- Human-authored legitimate
- Human-authored fraudulent

The fraudulent examples in this corpus are synthetic scenarios, not real-world scam evidence. The AI classifier uses stylometric features from this separate corpus; EMSCAD fraud labels are not reused as AI labels. The AI-aware experiment compares baseline and AI-aware fraud models on the same held-out EMSCAD test set. Results from a synthetic corpus should not be generalized to all real-world AI-written postings.

### SHAP explainability

For research-mode fraud artifacts, training persists the transformed feature background used by `shap.LinearExplainer` to explain the trained logistic model. The API returns ranked feature contributions only when research artifacts exist and SHAP is available. SHAP explanations are not reported for demo predictions.

### Job Autopsy, salary, and safety checks

The autopsy is assembled from the supplied posting and the available fraud, AI-writing, and SHAP results. Its evidence graph can be filtered by fraud, AI-writing, SHAP, or final decision; selecting a node highlights connected evidence. Salary notes expand on demand. Safety checks identify which supplied pre-application details are present and which are missing.

Salary reporting describes the provided salary’s presence, format, and currency. The application does not provide an independently verified market benchmark. Completeness checks are prompts to follow up, not proof that a posting is unsafe.

### Cross-source comparison

Users can enter up to five comparison sources. The API accepts `platform`, `title`, `company`, `location`, `salary`, and `url` for each source. The app compares the details supplied by the user; it does not search job sites or automatically verify company identity. Text comparison normalizes case and whitespace only, and salary values are not converted between currencies or units.

## Architecture

```text
Chrome extension ──┐
                   ├──> React + Vite frontend ──> FastAPI backend
Dashboard input ───┘                                  │
                                                      ├── Fraud analysis
                                                      ├── AI-writing analysis
                                                      ├── SHAP (research artifacts only)
                                                      └── Job Autopsy / comparison response

EMSCAD ──> fraud training and held-out evaluation
Controlled AI corpus ──> stylometric AI classifier and AI-aware experiment
```

The extension keeps the configured hosted API as its default. Its **API connection** setting can point to a different deployment or to `http://localhost:8000` for local testing. The backend includes a Chrome extension CORS rule.

## Technology

Documented repository components include:

- **Backend:** Python, FastAPI, scikit-learn LogisticRegression pipelines, SHAP (research explanations), and pytest.
- **Frontend:** React, Vite, and npm.
- **Browser integration:** Chrome extension with site adapters and a generic fallback.
- **Data and experiments:** EMSCAD for fraud labels; a separate generated, provenance-labeled corpus for the AI-writing experiment.

## Live demo

No live frontend or backend URL is documented in the repository README. Use the local setup below, or configure the extension with a deployment URL supplied by the project maintainer.

## Local setup

### Requirements

Use Python and Node.js/npm. The repository README does not specify version numbers or document a backend dependency installation command.

### Backend

From the repository root:

```bash
cd backend
python -m uvicorn app.api:app --host 127.0.0.1 --port 8000 --reload
```

If the backend dependency file has a different name or the project uses another installation method, follow the files in `backend/`.

### Frontend

In a second terminal, from the repository root:

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend at `http://localhost:8000`.

### Chrome extension

1. Open `chrome://extensions` in Chrome and enable **Developer mode**.
2. Choose **Load unpacked** and select the repository’s `extension/` directory.
3. Open a supported job listing, choose **Analyze This Job**, review or edit the extracted fields, and submit the analysis.
4. Use **API connection** in the popup to change the API endpoint when needed.

The extension is user-triggered. It does not mass-scrape, auto-apply, bypass CAPTCHAs, automate login, or bypass access controls.

## Training and research

### Train on EMSCAD

Place the dataset at `data/raw/fake_job_postings.csv`, then run from the repository root:

```bash
cd backend
python -m app.train_models
```

The input must contain the expected schema and a fraud label named `fraudulent` or `fraud_label`. Training generates research artifacts and metrics; these outputs are not included as verified results in this README.

### Create the controlled AI corpus

```bash
cd backend
python -m app.create_ai_corpus
```

The generated file is `data/ai_corpus/ai_labeled_corpus.csv`. Review the corpus provenance and synthetic-data limitations before interpreting experiment results.

## Environment and configuration

The documented default is for the frontend to call `http://localhost:8000`; the extension has an API connection setting and defaults to its configured hosted API. The repository README does not identify frontend environment-variable names or document deployment URLs. Check the frontend and backend configuration files before setting deployment-specific variables.

## Repository layout

```text
backend/       FastAPI API, model training, and AI-corpus generation
data/demo/     Demonstration jobs for workflow testing
data/raw/      Local EMSCAD input location (not bundled here)
extension/     Chrome extension and job-site extraction adapters
frontend/      React + Vite dashboard and analyzer
Research artifacts and metrics are generated by real training runs
```

Generated training artifacts, the EMSCAD input, and research results may not be present until their respective workflows are run.

## Limitations and responsible use

- Demo scores and indicators demonstrate application behavior; they are not real-world accuracy estimates.
- Real-data metrics require a real EMSCAD training run. They are not claimed here.
- EMSCAD does not label AI-generated content. The AI-writing experiment uses a separate controlled corpus, including synthetic fraudulent scenarios.
- AI-writing likelihood is not fraud likelihood.
- SHAP is available only for suitable research artifacts and is unavailable in demo mode.
- Salary and completeness checks describe supplied fields; they do not verify market pay or establish employer legitimacy.
- Cross-source comparisons use user-entered details and do not crawl listings or verify company identity. Salary values are not converted.
- Job-site extraction depends on visible page content and selectors that may change.
- Treat every result as a prompt for independent verification, not as a hiring, eligibility, or fraud determination.

## Future improvements

Potential next steps, subject to validation, include evaluating on additional representative datasets, expanding and independently validating AI-writing data, monitoring model drift, improving source verification, and making salary comparisons currency- and period-aware.

## License

No license is documented in the repository README. Check the repository for a license before reusing or redistributing this project.
