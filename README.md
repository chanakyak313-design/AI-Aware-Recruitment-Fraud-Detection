# JobShield: Forensic Recruitment Fraud Detection & AI-Aware Screening

**Decoupling suspicious intent from AI-assisted writing.** JobShield is an explainable decision-support system that screens job postings for potential recruitment fraud while independently evaluating stylometric writing characteristics. Legitimate employers frequently use AI tools to draft or refine job descriptions; JobShield separates stylistic writing markers from fraudulent intent to avoid penalizing polished, AI-assisted copy.

> **Decision-Support Notice:** Predictions and explainability outputs are screening signals designed to assist human evaluators and support research/viva demonstrations. A flagged indicator or model probability does not constitute a definitive finding that a posting or employer is fraudulent.

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Core Features & Workflows](#core-features--workflows)
- [Technology Stack](#technology-stack)
- [Local Setup & Execution](#local-setup--execution)
- [Training & Research Reproduction](#training--research-reproduction)
- [Chrome Extension](#chrome-extension)
- [Repository Layout](#repository-layout)
- [Research Boundaries & Critical Limitations](#research-boundaries--critical-limitations)
- [Testing](#testing)
- [License](#license)

---

## Overview

Job seekers increasingly confront deceptive recruitment schemes, including identity theft, fee extortion, and check-cashing fraud. Concurrently, generative AI tools have made polished writing trivial for both legitimate hiring teams and bad actors. Conflating AI authorship with fraudulent intent creates false positives and misdirects candidate vigilance.

JobShield implements a decoupled two-signal verification architecture:
1. **Fraud Classification Engine:** Evaluates empirical fraud signals, contact and domain integrity, and structural anomalies.
2. **AI Stylometry Engine:** Evaluates statistical text properties (sentence variation, lexical diversity, perplexity markers) without treating AI writing style as evidence of fraud.

The application operates in two distinct runtime modes:
- **Demo Mode:** Uses pre-bundled demonstration jobs and fallback scoring pipelines to showcase full UI workflows without requiring large external training datasets.
- **Research Mode:** Activated when a real dataset is trained locally, exposing genuine held-out evaluation metrics, confusion matrices, background datasets, and local SHAP feature attributions.

---

## System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          INGESTION CHANNELS                            │
│   Web Dashboard Input   │  CSV Batch Upload  │  Chrome Extension (MV3)  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTP POST /api/analyze
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       FASTAPI BACKEND SERVICE                          │
│                                                                        │
│   ┌───────────────────────────┐     ┌──────────────────────────────┐   │
│   │ Fraud Feature Extraction  │     │ Stylometric Text Extraction  │   │
│   │ (TF-IDF N-grams, Domain,  │     │ (Burstiness, Length Var.,    │   │
│   │  Salary, Questions, Fee)  │     │  Type-Token Ratio, Punct.)   │   │
│   └─────────────┬─────────────┘     └──────────────┬───────────────┘   │
│                 │                                  │                   │
│                 ▼                                  ▼                   │
│   ┌───────────────────────────┐     ┌──────────────────────────────┐   │
│   │     Fraud Classifier      │     │    AI-Text Stylometry        │   │
│   │   (Logistic Regression)   │     │   (Logistic Regression)      │   │
│   └─────────────┬─────────────┘     └──────────────┬───────────────┘   │
│                 │                                  │                   │
│                 ├────────────────┬─────────────────┘                   │
│                 ▼                ▼                                     │
│   ┌───────────────────────────┐ ┌──────────────────────────────────┐   │
│   │  SHAP LinearExplainer     │ │      Job Autopsy Engine          │   │
│   │  (Local feature weights)  │ │   (Relational Evidence Graph,    │   │
│   │  [Research Mode only]     │ │    Domain Checks, Safety Audit)  │   │
│   └─────────────┬─────────────┘ └──────────────────┬───────────────┘   │
│                 └────────────────┬─────────────────┘                   │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │ JSON Analysis Response
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   REACT + VITE FORENSIC DASHBOARD                      │
│   • Single-Posting Analyzer     • Interactive Autopsy Evidence Graph   │
│   • Directional SHAP Summary    • Domain Mismatch & Contact Warnings   │
│   • CSV Batch Screening Queue   • Batch Risk-Tier Filtering Insights   │
│   • Session Review Log          • Side-by-Side Multi-Job Comparison    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Core Features & Workflows

### 1. Single-Posting Forensic Analyzer
- **Dual-Model Scoring:** Computes an independent fraud risk score (Low, Medium, High) alongside an independent AI-text stylometry probability.
- **Domain & Contact Verification:** Detects public free-webmail addresses (`@gmail.com`, `@yahoo.com`, etc.) used as corporate recruiter contacts, and flags mismatches between company websites and application URLs.
- **Job Autopsy Evidence Graph:** Synthesizes extracted fields into an interactive node-link graph mapping Title, Company, Description, Salary, Contact, Domain, and Stylometry to positive and negative risk factors.
- **Local SHAP Feature Contributions:** When research artifacts are available, computes and displays top directional feature contributors (both risk-increasing and risk-mitigating) with exact weights.
- **Pre-Application Completeness Audit:** Inspects presence of key transparency fields (salary structure, company profile, screening questions) to generate follow-up safety prompts.
- **Printable Audit Report:** Provides a formatted, printable forensic summary with complete breakdown and decision-support disclaimers.

### 2. CSV Batch Screening & Insights Dashboard
- **Automated Batch Processing:** Ingests CSV files containing up to 25 job postings and processes them through an interactive progress queue with cancellation support.
- **Aggregated Insights Dashboard:** Summarizes batch risk breakdown with interactive count cards (High, Medium, Low, Failed) that filter the batch table on click.
- **Signal Frequency Breakdown:** Aggregates and ranks recurring fraud indicators across the entire batch.
- **Safe CSV Export:** Exports full batch results with formula-injection sanitization (escaping leading `=`, `+`, `-`, `@` characters).

### 3. Session Review Log & Multi-Job Comparative SHAP
- **Human-in-the-Loop Tracking:** Stores reviewed postings across the session with editable reviewer notes and workflow statuses (`Pending Review`, `Verified Legitimate`, `Suspected Fraud`, `Escalated`).
- **Side-by-Side Comparative SHAP:** Allows selecting 2 or 3 job postings to compare their feature attributions and risk vectors side-by-side in a multi-column comparative layout.

### 4. Cross-Source Listing Discrepancy Checker
- Accepts up to 5 user-supplied cross-postings for the same role (across platforms like LinkedIn, Indeed, etc.).
- Normalizes whitespace and casing to highlight discrepancies in job titles, claimed salaries, locations, and hiring organizations.

---

## Technology Stack

### Backend
- **Python:** Modern typed Python (tested on Python 3.10+)
- **API Framework:** FastAPI `>=0.115`, Uvicorn `>=0.30`, Starlette
- **Machine Learning:** Scikit-Learn `>=1.4`
  - `LogisticRegression(max_iter=4000, class_weight="balanced")` for fraud classification
  - `LogisticRegression(max_iter=4000, class_weight="balanced")` for stylometric text analysis
  - `TfidfVectorizer(ngram_range=(1, 2), min_df=3, max_features=6000)`
  - `ColumnTransformer`, `StandardScaler`, `OneHotEncoder`, `SimpleImputer`
- **Model Explainability:** SHAP `>=0.46` (`shap.LinearExplainer`)
- **Data Handling:** Pandas `>=2.2`, NumPy `>=1.26`, Joblib `>=1.4`
- **Testing:** Pytest `>=8`, HTTPX `>=0.27`

### Frontend
- **Framework:** React 18 (`react`, `react-dom` `^18.3.1`)
- **Build Tool:** Vite `^5.4.10` (`@vitejs/plugin-react`)
- **Typography:** Plus Jakarta Sans (headings), Inter (body), Newsreader (editorial serif), DM Mono (metrics & code)
- **Styling:** Custom, zero-dependency responsive CSS design system with prefers-reduced-motion support

### Chrome Extension
- **Platform:** Chrome Extension Manifest V3
- **Components:** Background Service Worker (`background.js`), Content Scripts (`content.js`), Interactive Popup (`popup.html`, `popup.js`)
- **Extraction Adapters:** Dedicated DOM extractors for **LinkedIn, Indeed, Glassdoor, Naukri**, and a generic semantic fallback parser.

---

## Local Setup & Execution

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup
From the repository root:
```bash
cd backend
python -m venv .venv

# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.api:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI backend will start at `http://127.0.0.1:8000`. You can verify the API health at `http://127.0.0.1:8000/api/health`.

### 2. Frontend Setup
In a second terminal, from the repository root:
```bash
cd frontend
npm install
npm run dev
```
The Vite development server will start at `http://localhost:5173`. Open this URL in your web browser.

To verify a production build:
```bash
npm run build
```

---

## Training & Research Reproduction

The repository includes demonstration data (`data/demo/demo_jobs.csv`) out of the box. To train research models on the full EMSCAD corpus:

### Step 1: Place the EMSCAD Dataset
Download the EMSCAD dataset (University of the Aegean Employment Scam Aegean Dataset) and place the CSV file at:
```text
data/raw/fake_job_postings.csv
```
The dataset must contain the standard EMSCAD schema and a documented fraud label column (`fraudulent` or `fraud_label`).

### Step 2: Generate the Controlled AI Corpus
Run the reproducible corpus generation script:
```bash
cd backend
python -m app.create_ai_corpus
```
This writes `data/ai_corpus/ai_labeled_corpus.csv` containing a balanced, 40-sample controlled corpus.

### Step 3: Train the Models & Generate Metrics
Execute model training:
```bash
cd backend
python -m app.train_models
```
This executes:
1. Stratified 80/20 train/test split on EMSCAD with a fixed random seed (`42`).
2. Training of the fraud Logistic Regression pipeline (text TF-IDF + structured feature preprocessing).
3. Extraction of background samples for `shap.LinearExplainer`.
4. Training of the stylometric Logistic Regression model on the controlled AI corpus (75/25 split).
5. Evaluation of an AI-aware experiment model comparing baseline fraud metrics with an augmented model incorporating the stylometric signal.
6. Persistence of model artifacts to `backend/models/fraud_model.joblib` and `backend/models/ai_model.joblib`.
7. Generation of research metrics to `results/experiment_summary.json`.

After training, the API exposes live research results at `GET /api/research-results` and `/api/model-info`.

---

## Chrome Extension

The extension allows users to extract job details directly from job portals into JobShield.

### Installation
1. Open Google Chrome (or Microsoft Edge) and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the repository's `extension/` folder.
4. The extension icon will appear in your browser toolbar.

### Usage & Safety
1. Navigate to a job posting on **LinkedIn, Indeed, Glassdoor, Naukri**, or any website with job markup.
2. Click the extension icon and select **Analyze This Job**.
3. Review and edit the extracted title, company, description, location, salary, website, and application URL in the popup.
4. Submit the analysis to send the posting to the JobShield API.
5. Use the **API connection** field in the popup settings if your backend runs on a custom host/port (defaults to hosted or `http://localhost:8000`).

*Note on Extension Governance:* The extension is strictly user-triggered. It does not perform automated crawling, mass scraping, form auto-filling, credential harvesting, or CAPTCHA circumvention.

---

## Repository Layout

```text
MINPROJ/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── api.py                  # FastAPI routes (/health, /model-info, /analyze, etc.)
│   │   ├── config.py               # File paths, model directories, CORS origins
│   │   ├── create_ai_corpus.py     # Controlled 40-sample synthetic AI corpus generator
│   │   ├── data_pipeline.py        # Feature extraction, stylometry metrics, domain checks
│   │   ├── model_service.py        # FraudAIAnalyzer service, Logistic Regression pipelines, SHAP
│   │   ├── schemas.py              # Pydantic request and response schemas
│   │   └── train_models.py         # Standalone model training and evaluation script
│   ├── models/                     # Persisted joblib model artifacts (created upon training)
│   ├── tests/
│   │   └── test_api.py             # Test suite verifying API endpoints and contract shapes
│   ├── requirements.txt            # Python dependencies
│   └── runtime.txt                 # Python runtime specification
├── data/
│   ├── ai_corpus/
│   │   ├── ai_labeled_corpus.csv   # Generated controlled AI corpus (40 samples)
│   │   └── README.md               # Documentation of AI corpus provenance and methodology
│   ├── demo/
│   │   └── demo_jobs.csv           # Bundled demo jobs for workflow exploration
│   └── raw/
│       ├── fake_job_postings.csv   # Expected local path for raw EMSCAD dataset
│       └── README.md               # Instructions for placing EMSCAD data
├── extension/
│   ├── adapters/
│   │   ├── generic.js              # Generic heuristic DOM extractor
│   │   ├── glassdoor.js            # Glassdoor-specific extractor
│   │   ├── indeed.js               # Indeed-specific extractor
│   │   ├── linkedin.js             # LinkedIn-specific extractor
│   │   └── naukri.js               # Naukri-specific extractor
│   ├── background.js               # MV3 service worker
│   ├── content.js                  # Content script coordinating page extraction
│   ├── manifest.json               # Chrome Extension Manifest V3 configuration
│   ├── popup.html                  # Popup review interface
│   ├── popup.js                    # Popup logic and API client
│   └── styles.css                  # Extension UI styling
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Main application UI, routing, Analyzer, Batch, History
│   │   ├── styles.css              # JobShield design system styles & editorial theme
│   │   ├── autopsy.css             # Evidence graph styling
│   │   ├── autopsy-interactions.css# Graph node interaction styles
│   │   └── main.jsx                # React root entrypoint
│   ├── index.html                  # HTML template with Google Fonts
│   ├── package.json                # Frontend npm configuration and scripts
│   └── vite.config.js              # Vite configuration
├── results/
│   └── experiment_summary.json     # Generated research metrics and confusion matrices
└── README.md                       # Project documentation
```

---

## Research Boundaries & Critical Limitations

### 1. Synthetic 40-Sample AI Corpus Limitation
- The AI stylometry classifier and AI-aware experiment in this repository are trained on a controlled synthetic corpus generated by `backend/app/create_ai_corpus.py` consisting of **exactly 40 samples**:
  - 10 AI-generated legitimate
  - 10 AI-generated fraudulent (synthetic scam scenarios)
  - 10 human-authored legitimate (researcher control)
  - 10 human-authored fraudulent (synthetic scam scenarios)
- **Synthetic Nature:** The fraudulent text samples in this corpus represent synthetic, simulated scenarios (such as upfront payment requests and unrealistic daily rates). They do not represent real-world scam communications, nor do they originate from actual victim transcripts.
- **Proof-of-Concept Boundary:** This corpus was created solely as a proof-of-concept to demonstrate the decoupled-signal methodology (showing how stylometric features can be extracted and modeled independently of EMSCAD).
- **No Real-World AI Generalizability:** Results from this 40-sample corpus **must not be claimed or interpreted as a general-purpose real-world AI-text detector**. The stylometric classifier reflects only the specific templates used in the experiment and cannot reliably detect open-ended text written by modern large language models in arbitrary real-world contexts.

### 2. EMSCAD Dataset Imbalance & Historical Constraints
- EMSCAD contains 17,880 historical job postings collected around 2012–2014 by the University of the Aegean. Only 866 (4.84%) postings are fraudulent, creating a severe class imbalance (~19:1).
- Because EMSCAD was collected prior to modern generative LLMs, it contains no native ground-truth AI authorship labels.
- The project intentionally avoids retrofitting subjective AI labels onto EMSCAD.

### 3. Machine Learning Model Architecture
- The classification pipelines use standard **Logistic Regression with balanced class weights** (`LogisticRegression(max_iter=4000, class_weight="balanced")`).
- The models are not calibrated via probability calibration techniques (such as Platt scaling or isotonic regression); output probabilities reflect the standard logistic sigmoid transformation of decision function scores.

### 4. Operational & Decision-Support Scope
- **Not an Automated Adjudication Engine:** Predictions, SHAP bars, and risk tiers are decision-support heuristics. They do not constitute legal proof of fraud or employer illegitimacy.
- **Salary Transparency Checks:** Salary analysis identifies intervals, currencies, and missing compensation fields; it does not benchmark compensation against verified, real-time macroeconomic wage indexes.
- **Cross-Source Comparison:** Discrepancy checks compare only user-entered text across fields; the system does not crawl third-party databases, verify corporate registrations, or authenticate employer identities.
- **Selector Maintenance:** Third-party job boards frequently update their DOM structures. Extension extraction relies on CSS selectors that may require ongoing maintenance.

---

## Testing

The backend includes a comprehensive automated test suite verifying API routes, Pydantic schema validation, autopsy evidence graph integrity, path sanitization, and input rejection:

```bash
cd backend
python -m pytest
```

---

## License

This repository does not currently specify a license, and no permission is granted to reuse or redistribute the code. In addition, review and adhere to the dataset's own terms of use and licensing (such as EMSCAD) regarding any data artifacts.
