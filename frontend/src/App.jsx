
import { useEffect, useMemo, useRef, useState } from 'react';
import './styles.css';
import './autopsy.css';
import './autopsy-interactions.css';

/*
 * ============================================================
 * API CONFIGURATION
 * ============================================================
 *
 * In local Vite development (import.meta.env.DEV), default to ''
 * so all /api requests are routed to the local backend through
 * the Vite development server proxy (vite.config.js -> http://localhost:8000).
 *
 * If VITE_API_URL is explicitly set (in .env or deployment env), that is used.
 * In production builds (import.meta.env.PROD), if VITE_API_URL is not set,
 * it falls back to the deployed Render API.
 */
const API_BASE_URL =
  import.meta.env.VITE_API_URL !== undefined
    ? import.meta.env.VITE_API_URL
    : import.meta.env.DEV
      ? ''
      : 'https://ai-aware-recruitment-fraud-detection-api.onrender.com';

const emptyForm = {
  title: '',
  company: '',
  location: '',
  salary: '',
  employment_type: '',
  experience: '',
  website: '',
  application_url: '',
  email: '',
  description: '',
  requirements: '',
  benefits: '',
};

const DEMO_PRESETS = [
  {
    id: 'suspicious',
    label: 'Suspicious posting (Illustrative)',
    data: {
      title: 'Urgent Hiring Data Entry Clerk',
      company: 'FastCashNow',
      location: 'Remote',
      salary: '$2000 - $5000 per day',
      employment_type: 'Full-time',
      experience: 'Entry level',
      website: 'https://fastcashnow.xyz',
      application_url: '',
      email: 'applyfastcashnow@gmail.com',
      description:
        'Urgent hiring now! Work from home and start today. Applicants must pay a registration fee and send bank details to begin onboarding immediately.',
      requirements:
        'No experience required. Anyone can apply.',
      benefits:
        'Flexible working hours and immediate joining.',
    },
  },
  {
    id: 'legitimate_human',
    label: 'Legitimate job — Human style (Illustrative)',
    data: {
      title: 'Operations Coordinator',
      company: 'Acme Global Logistics',
      location: 'Chicago, IL',
      salary: '$65,000 - $80,000 per year',
      employment_type: 'Full-time',
      experience: '2+ years',
      website: 'https://acmelogistics.example.com',
      application_url: 'https://acmelogistics.example.com/careers/ops-101',
      email: 'careers@acmelogistics.example.com',
      description:
        'We need someone organized to keep our small operations team on track. You will book meetings, follow up with suppliers, and tidy up our shared records. There is room to learn the business and take on more responsibility as our team grows.',
      requirements:
        '2+ years of administrative or office experience. Good communication skills and familiarity with spreadsheets.',
      benefits:
        'Health insurance, paid time off, and retirement match.',
    },
  },
  {
    id: 'legitimate_ai',
    label: 'Legitimate job — AI style (Illustrative)',
    data: {
      title: 'Operations Coordinator',
      company: 'Acme Global Logistics',
      location: 'Chicago, IL',
      salary: '$65,000 - $80,000 per year',
      employment_type: 'Full-time',
      experience: '2+ years',
      website: 'https://acmelogistics.example.com',
      application_url: 'https://acmelogistics.example.com/careers/ops-101',
      email: 'careers@acmelogistics.example.com',
      description:
        'The team is seeking an operations coordinator to support scheduling, vendor communication, and process documentation. The successful candidate will collaborate with colleagues, maintain clear records, and improve routine workflows.',
      requirements:
        'Proven background in operations coordination. Demonstrated capability to streamline operational processes and optimize cross-departmental documentation.',
      benefits:
        'Comprehensive healthcare benefits package, dedicated professional development stipend, and 401(k) matching program.',
    },
  },
];

const percent = (value, digits = 1) =>
  value == null
    ? 'N/A'
    : `${(Number(value) * 100).toFixed(digits)}%`;

const labelize = (value) =>
  String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const metrics = [
  'accuracy',
  'precision',
  'recall',
  'f1',
  'roc_auc',
  'pr_auc',
];

function Icon({ children }) {
  return (
    <span className="icon" aria-hidden="true">
      {children}
    </span>
  );
}

function Sidebar({ tab, setTab, mode, apiAvailable }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-orbit">
          <span>JS</span>
        </div>

        <div>
          <strong>JobShield</strong>
          <small>AI intelligence</small>
        </div>
      </div>

      <div className="sidebar-label">WORKSPACE</div>

      <nav className="side-nav" aria-label="Primary navigation">
        {[
          ['overview', 'Overview', '◈'],
          ['analyzer', 'Analyzer', '⌕'],
          ['research', 'Research', '▣'],
          ['methodology', 'Methodology', '⚙'],
          ['extension', 'Extension', '⇱'],
        ].map(([id, label, icon]) => (
          <button
            key={id}
            className={tab === id ? 'side-link active' : 'side-link'}
            onClick={() => setTab(id)}
          >
            <Icon>{icon}</Icon>
            <span>{label}</span>

            {id === 'analyzer' && <b>LIVE</b>}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="status-card">
          <span
            className={`status-dot ${apiAvailable ? '' : 'offline'}`}
          />

          <div>
            <strong>System status</strong>
            <small>
              {apiAvailable ? 'API connected' : 'API unavailable'}
            </small>
          </div>
        </div>

        <small className="version">
          v1.0 · {mode === 'RESEARCH MODE' ? 'research build' : 'demo build'}
        </small>
      </div>
    </aside>
  );
}

function Topbar({ mode, tab, onAnalyze }) {
  const section =
    tab === 'overview'
      ? 'OVERVIEW'
      : tab === 'research'
        ? 'RESEARCH'
        : tab === 'methodology'
          ? 'METHODOLOGY'
          : tab === 'extension'
            ? 'EXTENSION'
            : 'ANALYZER';

  return (
    <header className="topbar">
      <div>
        <span className="breadcrumb">
          JOBSHIELD / <strong>{section}</strong>
        </span>

        <h1>Recruitment fraud intelligence</h1>
      </div>

      <div className="top-actions">
        <span className="mode-badge">
          <i />
          {mode}
        </span>

        <button className="top-analyze" onClick={onAnalyze}>
          New analysis <span>→</span>
        </button>
      </div>
    </header>
  );
}

function ScoreRing({ value, kind }) {
  const numeric = value == null ? 0 : Number(value);

  return (
    <div
      className={`score-ring ${kind}`}
      style={{ '--score': `${numeric * 360}deg` }}
    >
      <div>
        <strong>{percent(value, 1)}</strong>
        <small>
          {kind === 'fraud' ? 'fraud probability' : 'AI-generation'}
        </small>
      </div>
    </div>
  );
}

function SignalList({ title, items, kind }) {
  return (
    <section className={`signal-card ${kind}`}>
      <div className="card-heading">
        <span className="heading-icon">
          {kind === 'fraud' ? '!' : '✦'}
        </span>

        <div>
          <span className="overline">
            {kind === 'fraud' ? 'FRAUD ANALYSIS' : 'WRITING ANALYSIS'}
          </span>

          <h3>{title}</h3>
        </div>
      </div>

      {items?.length ? (
        <ul>
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>
              <span>↳</span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">
          No indicators reported for this posting.
        </p>
      )}
    </section>
  );
}

/*
 * Deterministic trigger phrases extracted directly from backend data_pipeline.py
 * and model_service.py rules. Used strictly for rule-based text evidence annotation.
 */
const FRAUD_PHRASE_DICTIONARY = {
  'Application or registration fee mentioned': [
    'application fee',
    'registration fee',
    'pay fee',
    'pay upfront',
    'processing fee',
  ],
  'Request for sensitive or personal information': [
    'bank details',
    'password',
    'ssn',
    'cvv',
    'routing number',
    'personal id',
  ],
  'Urgency language detected': [
    'urgent',
    'immediately',
    'hiring now',
    'limited seats',
    'fast interview',
  ],
  'Suspicious off-platform contact requested': [
    'whatsapp',
    'telegram',
    'signal',
    'text me',
    'dm me',
    'pay on',
  ],
  'Contact requests moved off the official platform': [
    'whatsapp',
    'telegram',
    'signal',
    'chat on whatsapp',
  ],
};

function TextEvidencePanel({ text, fraudIndicators }) {
  const activeIndicators = useMemo(() => {
    return (fraudIndicators || []).filter(
      (ind) => ind !== 'No strong fraud indicators were detected'
    );
  }, [fraudIndicators]);

  const { segments, matchedPhrases, unmatchedIndicators } = useMemo(() => {
    const rawText = String(text || '');
    if (!rawText.trim() || !activeIndicators.length) {
      return {
        segments: [{ text: rawText, isMatch: false }],
        matchedPhrases: [],
        unmatchedIndicators: activeIndicators,
      };
    }

    // Collect all candidate phrases for indicators that actually fired
    const phraseMap = new Map();
    activeIndicators.forEach((indicator) => {
      const phrases = FRAUD_PHRASE_DICTIONARY[indicator] || [];
      phrases.forEach((phrase) => {
        if (!phraseMap.has(phrase.toLowerCase())) {
          phraseMap.set(phrase.toLowerCase(), indicator);
        }
      });
    });

    const candidatePhrases = Array.from(phraseMap.keys()).sort(
      (a, b) => b.length - a.length
    );

    if (!candidatePhrases.length) {
      return {
        segments: [{ text: rawText, isMatch: false }],
        matchedPhrases: [],
        unmatchedIndicators: activeIndicators,
      };
    }

    // Build regex with literal phrase matching and boundary awareness
    const escaped = candidatePhrases.map((p) =>
      p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const regex = new RegExp(`(${escaped.join('|')})`, 'gi');

    const segs = [];
    let lastIndex = 0;
    const matchesFound = new Set();
    const matchedIndicatorSet = new Set();

    let match;
    while ((match = regex.exec(rawText)) !== null) {
      const start = match.index;
      const end = regex.lastIndex;
      const matchedStr = match[0];
      const matchedLower = matchedStr.toLowerCase();
      const indicator = phraseMap.get(matchedLower);

      if (start > lastIndex) {
        segs.push({
          text: rawText.slice(lastIndex, start),
          isMatch: false,
        });
      }

      segs.push({
        text: matchedStr,
        isMatch: true,
        indicator,
      });

      matchesFound.add(matchedStr);
      if (indicator) matchedIndicatorSet.add(indicator);
      lastIndex = end;
    }

    if (lastIndex < rawText.length) {
      segs.push({
        text: rawText.slice(lastIndex),
        isMatch: false,
      });
    }

    const unmatched = activeIndicators.filter(
      (ind) => !matchedIndicatorSet.has(ind)
    );

    return {
      segments: segs,
      matchedPhrases: Array.from(matchesFound),
      unmatchedIndicators: unmatched,
    };
  }, [text, activeIndicators]);

  const hasDescription = Boolean(String(text || '').trim());

  return (
    <section className="surface evidence-text-card">
      <div className="card-heading">
        <span className="heading-icon">¶</span>
        <div>
          <span className="overline">RULE-BASED TEXT EVIDENCE</span>
          <h3>Job description phrase matches</h3>
          <p>
            Deterministic matches based strictly on keyword triggers from the
            fired fraud rules. Distinct from SHAP feature contributions.
          </p>
        </div>
      </div>

      <div className="evidence-text-body">
        {!hasDescription ? (
          <p className="muted">No job description text provided to evaluate.</p>
        ) : (
          <div className="evidence-text-content" tabIndex="0" role="region" aria-label="Highlighted job description">
            {segments.map((seg, idx) =>
              seg.isMatch ? (
                <mark
                  key={idx}
                  className="evidence-phrase-highlight"
                  title={`Matched rule: ${seg.indicator}`}
                >
                  {seg.text}
                </mark>
              ) : (
                <span key={idx}>{seg.text}</span>
              )
            )}
          </div>
        )}
      </div>

      <div className="evidence-text-footer">
        {matchedPhrases.length > 0 ? (
          <div className="evidence-matched-summary">
            <strong>Matched in description:</strong>{' '}
            {matchedPhrases.map((phrase, i) => (
              <span key={i} className="evidence-tag">
                "{phrase}"
              </span>
            ))}
          </div>
        ) : (
          <div className="evidence-matched-summary muted">
            No exact indicator phrases were detected in the description.
          </div>
        )}

        {unmatchedIndicators.length > 0 && (
          <div className="evidence-unmatched-note">
            <small>
              <em>Field/metadata signals without matching description phrases:</em>{' '}
              {unmatchedIndicators.join(' · ')}
            </small>
          </div>
        )}

        <p className="fine-print">
          Rule-based highlights denote deterministic keyword detections only.
          They do not represent statistical SHAP attributions or model feature weights.
        </p>
      </div>
    </section>
  );
}

function ShapPanel({ shap }) {
  if (!shap?.available) {
    return (
      <section className="shap-card unavailable">
        <div className="card-heading">
          <span className="heading-icon">◌</span>

          <div>
            <span className="overline">EXPLAINABILITY</span>
            <h3>Model contributions</h3>
          </div>
        </div>

        <p>{shap?.message || 'SHAP explanation unavailable.'}</p>
      </section>
    );
  }

  const max = Math.max(
    ...(shap.features || []).map((item) =>
      Math.abs(Number(item.value))
    ),
    0.01
  );

  return (
    <section className="shap-card">
      <div className="card-heading">
        <span className="heading-icon">◌</span>

        <div>
          <span className="overline">EXPLAINABILITY</span>

          <h3>Why did the model reach this assessment?</h3>

          <p>Feature contributions from the trained fraud model.</p>
        </div>
      </div>

      <div className="shap-list">
        {(shap.features || []).map((item) => (
          <div className="shap-row" key={item.feature}>
            <span className="shap-name" title={item.feature}>
              {labelize(
                String(item.feature || '').replace(/^.*__/, '')
              )}
            </span>

            <div className="shap-track">
              <i
                className={
                  Number(item.value) >= 0 ? 'positive' : 'negative'
                }
                style={{
                  width: `${(Math.abs(Number(item.value)) / max) * 100}%`,
                }}
              />
            </div>

            <strong
              className={
                Number(item.value) >= 0
                  ? 'positive-text'
                  : 'negative-text'
              }
            >
              {Number(item.value) > 0 ? '+' : ''}
              {Number(item.value).toFixed(3)}
            </strong>
          </div>
        ))}
      </div>

      <div className="shap-legend">
        <span>
          <i className="positive" /> pushes toward fraud
        </span>

        <span>
          <i className="negative" /> pushes away from fraud
        </span>
      </div>

      <p className="fine-print">
        Contributions indicate model behavior, not proof of causation or
        intent.
      </p>
    </section>
  );
}

/*
 * ============================================================
 * CSV BATCH SCREENING UTILITIES & COMPONENT
 * ============================================================
 */
const CSV_COLUMN_ALIASES = {
  title: ['title', 'job_title', 'jobtitle', 'job_name', 'role', 'position', 'job', 'headline'],
  company: ['company', 'company_name', 'companyname', 'organization', 'employer', 'hiring_organization'],
  description: ['description', 'job_description', 'jobdescription', 'job_details', 'details', 'summary', 'body'],
  salary: ['salary', 'salary_range', 'compensation', 'pay', 'pay_rate', 'wage', 'remuneration'],
  location: ['location', 'job_location', 'city', 'country', 'location_name', 'workplace'],
  employment_type: ['employment_type', 'employmenttype', 'job_type', 'type', 'schedule'],
  experience: ['experience', 'experience_level', 'seniority', 'level'],
  website: ['website', 'company_website', 'company_url', 'url'],
  application_url: ['application_url', 'applicationurl', 'apply_url', 'apply_link', 'application_link', 'link'],
  email: ['email', 'contact_email', 'contact'],
  requirements: ['requirements', 'job_requirements', 'qualifications', 'skills'],
  benefits: ['benefits', 'job_benefits', 'perks'],
};

function normalizeHeader(h) {
  return String(h || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseCSV(text) {
  if (!text || typeof text !== 'string') return [];
  let str = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  const len = str.length;

  while (i < len) {
    const char = str[i];
    if (char === '"') {
      if (inQuotes) {
        if (i + 1 < len && str[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        inQuotes = true;
        i++;
        continue;
      }
    }

    if (!inQuotes) {
      if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      }
      if (char === '\r' || char === '\n') {
        if (char === '\r' && i + 1 < len && str[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.some((f) => f.trim().length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      }
    }

    currentField += char;
    i++;
  }

  if (inQuotes) {
    throw new Error('Malformed CSV: Unclosed quotation mark detected.');
  }

  currentRow.push(currentField);
  if (currentRow.some((f) => f.trim().length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

function mapCSVToJobs(csvText) {
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    throw new Error('The uploaded CSV contains no job postings to analyze.');
  }

  const rawHeaders = rows[0];
  const headerMap = {};

  rawHeaders.forEach((h, colIdx) => {
    const norm = normalizeHeader(h);
    let matchedKey = null;
    for (const [key, aliases] of Object.entries(CSV_COLUMN_ALIASES)) {
      if (norm === key || aliases.includes(norm)) {
        matchedKey = key;
        break;
      }
    }
    if (matchedKey && headerMap[matchedKey] === undefined) {
      headerMap[matchedKey] = colIdx;
    }
  });

  if (headerMap.title === undefined && headerMap.description === undefined) {
    throw new Error(
      `Could not map required information from the CSV. The file must contain recognizable headers for at least job title (e.g. "title", "job title") or job description (e.g. "description", "job description"). Found headers: ${rawHeaders.join(', ')}`
    );
  }

  const dataRows = rows.slice(1);
  if (dataRows.length > 25) {
    throw new Error(
      `Upload rejected: The file contains ${dataRows.length} job postings, which exceeds the limit of 25 postings per batch. Please upload a CSV containing 25 or fewer postings.`
    );
  }

  const mappedJobs = dataRows.map((row, idx) => {
    const job = {
      title: '',
      company: '',
      location: '',
      salary: '',
      employment_type: '',
      experience: '',
      website: '',
      application_url: '',
      email: '',
      description: '',
      requirements: '',
      benefits: '',
    };

    for (const [key, colIdx] of Object.entries(headerMap)) {
      if (colIdx < row.length) {
        job[key] = (row[colIdx] || '').trim();
      }
    }

    return {
      id: idx + 1,
      payload: job,
    };
  });

  return {
    headers: rawHeaders,
    mappedKeys: Object.keys(headerMap),
    jobs: mappedJobs,
  };
}

function exportBatchResultsToCSV(results, fileName) {
  const headers = [
    'Row',
    'Job Title',
    'Company',
    'Location',
    'Salary',
    'Fraud Risk Level',
    'Fraud Probability',
    'AI-Text Estimate',
    'Key Indicators',
    'Status',
    'Error Details',
  ];

  const escapeVal = (val) => {
    const str = String(val == null ? '' : val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [headers.map(escapeVal).join(',')];

  results.forEach((r) => {
    const line = [
      r.id,
      r.payload.title || '',
      r.payload.company || '',
      r.payload.location || '',
      r.payload.salary || '',
      r.status === 'success' ? r.risk_level : r.status === 'failed' ? 'FAILED' : r.status.toUpperCase(),
      r.status === 'success' && r.fraud_probability != null
        ? `${(r.fraud_probability * 100).toFixed(1)}%`
        : 'N/A',
      r.status === 'success' && r.ai_generation_probability != null
        ? `${(r.ai_generation_probability * 100).toFixed(1)}%`
        : 'Not available',
      r.status === 'success'
        ? (r.fraud_indicators || [])
            .filter((ind) => ind !== 'No strong fraud indicators were detected')
            .join('; ')
        : '',
      r.status,
      r.error || '',
    ];
    lines.push(line.map(escapeVal).join(','));
  });

  const csvString = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanName = (fileName || 'batch_postings').replace(/\.csv$/i, '');
  link.setAttribute('download', `${cleanName}_screening_results.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/*
 * ============================================================
 * SCREENING HISTORY (SESSION STORAGE)
 * ============================================================
 */
const SESSION_STORAGE_KEY = 'jobshield_screening_history';
const MAX_HISTORY_ITEMS = 15;

function formatDateTime(date = new Date()) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return new Date().toLocaleString();
  }
}

function getSessionHistory() {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return { items: [], error: 'Session storage is not supported in this environment.' };
    }
    const data = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!data) return { items: [], error: null };
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return { items: parsed, error: null };
    }
    return { items: [], error: null };
  } catch (err) {
    return {
      items: [],
      error: 'Browser session storage is unavailable or restricted. History cannot be saved, but analysis continues to work.',
    };
  }
}

function saveSessionHistory(items) {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return { success: false, error: 'Session storage is not supported in this environment.' };
    }
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(items));
    return { success: true, error: null };
  } catch (err) {
    const isQuota =
      err &&
      (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22 ||
        err.code === 1014);
    const msg = isQuota
      ? 'Browser session storage is full. Screening history could not be saved, but analysis continues to work.'
      : 'Browser session storage is unavailable or restricted. History could not be saved, but analysis continues to work.';
    return { success: false, error: msg };
  }
}

function clearSessionHistory() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: 'Failed to clear session storage.' };
  }
}

function BatchScreening({ onInspect, onSaveHistoryItem, API_BASE_URL, setApiAvailable }) {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [parsedJobs, setParsedJobs] = useState([]);
  const [mappedKeys, setMappedKeys] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'ready' | 'processing' | 'completed' | 'cancelled'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState([]);
  const abortControllerRef = useRef(null);
  const fileInputRef = useRef(null);

  const resetState = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setFile(null);
    setFileName('');
    setParsedJobs([]);
    setMappedKeys([]);
    setParseError(null);
    setStatus('idle');
    setCurrentIndex(0);
    setResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    resetState();
    setFileName(selectedFile.name);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        const { mappedKeys: keys, jobs } = mapCSVToJobs(text);
        setMappedKeys(keys);
        setParsedJobs(jobs);
        setStatus('ready');
      } catch (err) {
        setParseError(err.message || 'Failed to parse CSV file.');
        setStatus('idle');
      }
    };
    reader.onerror = () => {
      setParseError('Failed to read the selected file from disk.');
      setStatus('idle');
    };
    reader.readAsText(selectedFile);
  };

  const handleStartScreening = async () => {
    if (parsedJobs.length === 0) return;

    setStatus('processing');
    setCurrentIndex(0);
    const initialResults = parsedJobs.map((j) => ({
      id: j.id,
      payload: j.payload,
      status: 'pending',
      fraud_probability: null,
      risk_level: null,
      ai_generation_probability: null,
      fraud_indicators: [],
      rawResult: null,
      error: null,
    }));
    setResults(initialResults);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const updatedResults = [...initialResults];

    for (let i = 0; i < parsedJobs.length; i++) {
      if (abortController.signal.aborted) {
        setStatus('cancelled');
        break;
      }

      setCurrentIndex(i + 1);
      const jobItem = parsedJobs[i];
      updatedResults[i] = { ...updatedResults[i], status: 'analyzing' };
      setResults([...updatedResults]);

      try {
        const payload = jobItem.payload;
        if (!payload.title.trim() && !payload.description.trim()) {
          throw new Error('Posting is missing both title and description.');
        }

        const response = await fetch(`${API_BASE_URL}/api/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...payload,
            comparison_sources: [],
          }),
          signal: abortController.signal,
        });

        let body = null;
        try {
          body = await response.json();
        } catch {
          throw new Error(`Server returned HTTP ${response.status} with an invalid response.`);
        }

        if (!response.ok) {
          const detail =
            typeof body?.detail === 'string'
              ? body.detail
              : Array.isArray(body?.detail)
                ? body.detail.map((item) => item?.msg || JSON.stringify(item)).join(', ')
                : null;
          throw new Error(detail || `Analysis failed (HTTP ${response.status}).`);
        }

        if (setApiAvailable) setApiAvailable(true);

        const successItem = {
          ...updatedResults[i],
          status: 'success',
          fraud_probability: body.fraud_probability,
          risk_level: body.risk_level,
          ai_generation_probability: body.ai_generation_probability,
          fraud_indicators: body.fraud_indicators || [],
          rawResult: body,
          error: null,
        };
        updatedResults[i] = successItem;

        if (onSaveHistoryItem) {
          onSaveHistoryItem({
            id: `hist_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
            timestamp: new Date().toISOString(),
            dateTime: formatDateTime(new Date()),
            title: payload.title?.trim() || 'Untitled posting',
            company: payload.company?.trim() || '—',
            risk_level: body.risk_level || 'UNKNOWN',
            fraud_probability: body.fraud_probability,
            ai_generation_probability: body.ai_generation_probability,
            source: 'batch',
            payload: { ...payload },
            result: body,
          });
        }
      } catch (err) {
        if (abortController.signal.aborted) {
          updatedResults[i] = {
            ...updatedResults[i],
            status: 'pending',
          };
          setStatus('cancelled');
          setResults([...updatedResults]);
          break;
        }

        updatedResults[i] = {
          ...updatedResults[i],
          status: 'failed',
          error: err.message || 'Analysis failed.',
        };
      }

      setResults([...updatedResults]);
    }

    if (!abortController.signal.aborted) {
      setStatus('completed');
    }
  };

  const handleCancelScreening = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStatus('cancelled');
  };

  const handleExport = () => {
    exportBatchResultsToCSV(results, fileName);
  };

  const completedCount = results.filter((r) => r.status === 'success' || r.status === 'failed').length;
  const progressPercent = parsedJobs.length > 0 ? Math.round((completedCount / parsedJobs.length) * 100) : 0;
  const highRiskCount = results.filter((r) => r.status === 'success' && r.risk_level === 'HIGH').length;
  const medRiskCount = results.filter((r) => r.status === 'success' && r.risk_level === 'MEDIUM').length;
  const lowRiskCount = results.filter((r) => r.status === 'success' && r.risk_level === 'LOW').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;

  return (
    <section className="surface batch-card">
      <div className="section-head">
        <div>
          <span className="overline">BATCH SCREENING</span>
          <h2>Screen multiple job postings (CSV)</h2>
          <p>
            Upload a spreadsheet of postings to screen risk levels and writing signals in a single batch.
          </p>
        </div>
      </div>

      <div className="batch-privacy-note" role="note">
        <Icon>ℹ</Icon>
        <div>
          <strong>Privacy notice:</strong> The CSV is read in your browser and is not stored by the app. Each job posting is sent to the configured analysis server, as it is for individual analysis. Job details and results may be kept temporarily in this tab’s history, can be cleared with Clear History, and are removed when the tab closes.
        </div>
      </div>

      {status === 'idle' && (
        <>
          <label className="batch-dropzone" tabIndex="0" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}>
            <span className="batch-dropzone-icon">⇪</span>
            <h4>Select a CSV file to screen</h4>
            <p>
              Upload up to 25 postings. Recognizes headers such as title/job title, company, description, salary, location, and requirements.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
            />
          </label>

          {parseError && (
            <p className="error-text" role="alert" style={{ marginTop: '16px' }}>
              <Icon>!</Icon>
              {parseError}
            </p>
          )}
        </>
      )}

      {status === 'ready' && (
        <div className="batch-file-info">
          <div className="batch-file-details">
            <strong>{fileName}</strong>
            <small>{parsedJobs.length} posting{parsedJobs.length !== 1 ? 's' : ''} detected · ready for screening (max limit: 25)</small>
            <div className="batch-mapped-tags">
              <span style={{ fontSize: '0.62rem', color: '#718096', alignSelf: 'center', marginRight: '4px' }}>Mapped columns:</span>
              {mappedKeys.map((key) => (
                <span key={key} className="batch-mapped-tag">{key}</span>
              ))}
            </div>
          </div>
          <div className="batch-file-actions">
            <button type="button" className="ghost-button" onClick={resetState}>
              Choose another file
            </button>
            <button type="button" className="primary-button" onClick={handleStartScreening}>
              Start batch screening ({parsedJobs.length}) <span>→</span>
            </button>
          </div>
        </div>
      )}

      {(status === 'processing' || status === 'completed' || status === 'cancelled') && (
        <>
          {status === 'processing' && (
            <div className="batch-progress-box">
              <div className="batch-progress-header">
                <span>
                  <strong>Screening in progress:</strong> Posting {currentIndex} of {parsedJobs.length} ({progressPercent}%)
                </span>
                <button type="button" className="ghost-button" onClick={handleCancelScreening} style={{ padding: '4px 10px', fontSize: '0.65rem' }}>
                  Cancel screening
                </button>
              </div>
              <div className="batch-progress-bar">
                <div className="batch-progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          )}

          {status === 'cancelled' && (
            <p className="result-note" style={{ borderLeftColor: '#f2c66e', color: '#fcd34d' }}>
              Screening was cancelled by user. Showing results for postings completed before cancellation ({completedCount} of {parsedJobs.length}).
            </p>
          )}

          {results.length > 0 && (
            <>
              <div className="batch-summary-stats">
                <span className="batch-stat-badge">Screened: <b>{completedCount} / {parsedJobs.length}</b></span>
                <span className="batch-stat-badge" style={{ borderColor: '#5a2632' }}>High risk: <b style={{ color: '#ef8796' }}>{highRiskCount}</b></span>
                <span className="batch-stat-badge" style={{ borderColor: '#544120' }}>Medium risk: <b style={{ color: '#f2c66e' }}>{medRiskCount}</b></span>
                <span className="batch-stat-badge" style={{ borderColor: '#204d37' }}>Low risk: <b style={{ color: '#6de0ad' }}>{lowRiskCount}</b></span>
                {failedCount > 0 && (
                  <span className="batch-stat-badge" style={{ borderColor: '#481f28' }}>Failed: <b style={{ color: '#ff8e9c' }}>{failedCount}</b></span>
                )}
              </div>

              <div className="batch-table-container">
                <table className="batch-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Job Title</th>
                      <th>Company</th>
                      <th>Fraud Risk</th>
                      <th>Fraud Prob.</th>
                      <th>AI-Text Estimate</th>
                      <th>Key Indicators</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row) => (
                      <tr key={row.id}>
                        <td style={{ fontFamily: 'DM Mono', color: '#64748b' }}>{row.id}</td>
                        <td style={{ fontWeight: 600 }}>{row.payload.title || <em style={{ color: '#64748b' }}>No title</em>}</td>
                        <td>{row.payload.company || <span style={{ color: '#64748b' }}>—</span>}</td>
                        <td>
                          {row.status === 'success' && (
                            <span className={`batch-risk-pill ${row.risk_level.toLowerCase()}`}>
                              {row.risk_level} RISK
                            </span>
                          )}
                          {row.status === 'failed' && (
                            <span className="batch-risk-pill failed">FAILED</span>
                          )}
                          {row.status === 'analyzing' && (
                            <span style={{ color: '#7186ff', fontStyle: 'italic', fontSize: '0.62rem' }}>Analyzing…</span>
                          )}
                          {row.status === 'pending' && (
                            <span style={{ color: '#64748b', fontSize: '0.62rem' }}>Queued</span>
                          )}
                        </td>
                        <td style={{ fontFamily: 'DM Mono' }}>
                          {row.status === 'success' && row.fraud_probability != null
                            ? `${(row.fraud_probability * 100).toFixed(1)}%`
                            : '—'}
                        </td>
                        <td style={{ fontFamily: 'DM Mono' }}>
                          {row.status === 'success' && row.ai_generation_probability != null
                            ? `${(row.ai_generation_probability * 100).toFixed(1)}%`
                            : row.status === 'success'
                              ? 'Not available'
                              : '—'}
                        </td>
                        <td className="batch-table-indicators">
                          {row.status === 'success' ? (
                            (row.fraud_indicators || []).filter((ind) => ind !== 'No strong fraud indicators were detected').length > 0 ? (
                              (row.fraud_indicators || []).filter((ind) => ind !== 'No strong fraud indicators were detected').join(' · ')
                            ) : (
                              <span style={{ color: '#64748b' }}>No strong fraud indicators</span>
                            )
                          ) : row.status === 'failed' ? (
                            <span style={{ color: '#ff8e9c' }}>{row.error}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          {row.status === 'success' ? (
                            <button
                              type="button"
                              className="ghost-button batch-inspect-btn"
                              title="Inspect this posting in the single-job analysis view with full autopsy and print report"
                              onClick={() => onInspect(row)}
                            >
                              Inspect <span>→</span>
                            </button>
                          ) : (
                            <span style={{ color: '#475569' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="batch-export-bar">
                <button type="button" className="ghost-button" onClick={resetState}>
                  Screen another file
                </button>
                <button type="button" className="primary-button batch-export-btn" onClick={handleExport}>
                  Export Results CSV <span>↓</span>
                </button>
              </div>

              <div className="batch-disclaimer-box">
                <p style={{ margin: 0 }}>
                  <strong>Disclaimer:</strong> Model outputs are decision-support signals and not definitive proof of fraud. The AI-text estimate is about writing style (such as vocabulary diversity and repetition) and does not prove AI authorship or fraud.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

function RecentHistory({ history, onInspect, onClearHistory, storageError }) {
  return (
    <section className="surface history-card">
      <div className="section-head history-head">
        <div>
          <span className="overline">SCREENING HISTORY</span>
          <h2>Recent screening history</h2>
          <p>
            Review and reopen recent single-job and batch analyses completed in this browser tab. Up to 15 recent analyses are saved.
          </p>
        </div>
        {history && history.length > 0 && (
          <button
            type="button"
            className="ghost-button history-clear-btn"
            onClick={onClearHistory}
            title="Clear all saved screening history from this session"
          >
            Clear History
          </button>
        )}
      </div>

      <div className="batch-privacy-note history-privacy-note" role="note">
        <Icon>ℹ</Icon>
        <div>
          <strong>Privacy notice:</strong> Job details and results may be kept temporarily in this tab’s history, can be cleared with Clear History, and are removed when the tab closes. Each posting is sent to the configured analysis server, as it is for individual analysis.
        </div>
      </div>

      {storageError && (
        <div className="history-storage-warning" role="alert">
          <Icon>!</Icon>
          <div>
            <strong>Storage notice:</strong> {storageError}
          </div>
        </div>
      )}

      {(!history || history.length === 0) ? (
        <div className="history-empty-state">
          <span className="history-empty-icon">⏱</span>
          <h4>No screening history yet</h4>
          <p>
            When you run single-job analyses or successful CSV batch screenings, they will appear here during this session.
          </p>
        </div>
      ) : (
        <div className="history-table-container" tabIndex={0} aria-label="Recent screening history table">
          <table className="history-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Job Title</th>
                <th>Company</th>
                <th>Date / Time</th>
                <th>Risk Level</th>
                <th>Type</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td style={{ fontFamily: 'DM Mono', color: '#64748b' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{item.title}</td>
                  <td>{item.company}</td>
                  <td style={{ fontFamily: 'DM Mono', fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {item.dateTime}
                  </td>
                  <td>
                    <span className={`batch-risk-pill ${(item.risk_level || 'unknown').toLowerCase()}`}>
                      {item.risk_level || 'UNKNOWN'} RISK
                    </span>
                  </td>
                  <td>
                    <span className="history-source-badge">
                      {item.source === 'batch' ? 'Batch' : 'Single'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ghost-button history-inspect-btn"
                      title="Inspect this posting in the single-job analysis view with full autopsy and print report"
                      onClick={() => onInspect(item)}
                    >
                      Inspect <span>→</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Analyzer({
  form,
  setForm,
  result,
  setResult,
  loading,
  error,
  onAnalyze,
  onDemo,
  onClear,
  comparisonDraft,
  setComparisonDraft,
  activePreset,
  onLoadPreset,
  API_BASE_URL,
  setApiAvailable,
  history,
  onSaveHistoryItem,
  onClearHistory,
  storageError,
}) {
  const [analyzerMode, setAnalyzerMode] = useState('single');

  const update = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const loadingSteps = useMemo(
    () => [
      'Extracting posting signals',
      'Scoring fraud indicators',
      'Analyzing writing patterns',
      'Preparing explanation',
    ],
    []
  );

  return (
    <div>
      <div className="analyzer-mode-bar">
        <div className="mode-toggle-group" role="tablist" aria-label="Analysis mode">
          <button
            type="button"
            role="tab"
            aria-selected={analyzerMode === 'single'}
            className={`mode-toggle-btn ${analyzerMode === 'single' ? 'active' : ''}`}
            onClick={() => setAnalyzerMode('single')}
          >
            Single posting
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={analyzerMode === 'batch'}
            className={`mode-toggle-btn ${analyzerMode === 'batch' ? 'active' : ''}`}
            onClick={() => setAnalyzerMode('batch')}
          >
            CSV batch screening
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={analyzerMode === 'history'}
            className={`mode-toggle-btn ${analyzerMode === 'history' ? 'active' : ''}`}
            onClick={() => setAnalyzerMode('history')}
          >
            Recent history {history?.length > 0 ? `(${history.length})` : ''}
          </button>
        </div>
      </div>

      {storageError && analyzerMode !== 'history' && (
        <div className="history-storage-warning" role="alert" style={{ marginBottom: '20px' }}>
          <Icon>!</Icon>
          <div>
            <strong>Storage notice:</strong> {storageError}
          </div>
        </div>
      )}

      {analyzerMode === 'single' && (
        <div className="analyzer-grid">
          <section className="surface editor-card">
            <div className="section-head">
              <div>
                <span className="overline">01 / INPUT</span>
                <h2>Job posting</h2>
                <p>
                  Review the visible information before sending it for analysis.
                </p>
              </div>

              <span className="live-label">
                <i />
                USER-TRIGGERED
              </span>
            </div>

            <div className="preset-bar">
              <span className="preset-bar-title">ILLUSTRATIVE PRESETS (CLICK TO POPULATE FORM)</span>
              <div className="preset-buttons">
                {DEMO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`ghost-button preset-btn ${activePreset === preset.id ? 'active' : ''}`}
                    onClick={() => onLoadPreset(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={onAnalyze}>
              <div className="field-grid">
                {[
                  'title',
                  'company',
                  'location',
                  'salary',
                  'employment_type',
                  'experience',
                  'website',
                  'application_url',
                ].map((field) => (
                  <label className="field" key={field}>
                    <span>{labelize(field)}</span>

                    <input
                      name={field}
                      value={form[field]}
                      onChange={update}
                      placeholder={`Enter ${labelize(field).toLowerCase()}`}
                    />
                  </label>
                ))}
              </div>

              <label className="field field-wide editor-field">
                <span>
                  Description <em>{form.description.length} characters</em>
                </span>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={update}
                  rows="9"
                  placeholder="Paste the visible job description here..."
                />
              </label>

              <div className="optional-row">
                <label className="field">
                  <span>
                    Requirements <em>optional</em>
                  </span>

                  <textarea
                    name="requirements"
                    value={form.requirements}
                    onChange={update}
                    rows="3"
                  />
                </label>

                <label className="field">
                  <span>
                    Benefits <em>optional</em>
                  </span>

                  <textarea
                    name="benefits"
                    value={form.benefits}
                    onChange={update}
                    rows="3"
                  />
                </label>
              </div>

              <details className="comparison-editor">
                <summary>Compare with another listing <span>Optional · enter details you found on another source</span></summary>
                <div className="field-grid comparison-fields">
                  {['platform', 'title', 'company', 'location', 'salary', 'url'].map((field) => (
                    <label className="field" key={field}>
                      <span>{labelize(field)}</span>
                      <input
                        value={comparisonDraft[field]}
                        onChange={(event) => setComparisonDraft((current) => ({ ...current, [field]: event.target.value }))}
                        placeholder={`Other source ${labelize(field).toLowerCase()}`}
                      />
                    </label>
                  ))}
                </div>
                <p className="fine-print">Only the values you enter are compared. This does not search external job sites.</p>
              </details>

              <div className="form-actions">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={onDemo}
                >
                  Load demo
                </button>

                <button
                  className="ghost-button"
                  type="button"
                  onClick={onClear}
                >
                  Clear
                </button>

                <button
                  className="primary-button"
                  disabled={loading}
                >
                  {loading ? 'Analyzing…' : 'Analyze job'} <span>→</span>
                </button>
              </div>

              {error && (
                <p className="error-text" role="alert">
                  <Icon>!</Icon>
                  {error}
                </p>
              )}
            </form>
          </section>

          <section className="surface preview-card">
            <div className="section-head">
              <div>
                <span className="overline">02 / OUTPUT</span>
                <h2>Analysis preview</h2>
              </div>

              {result && (
                <div className="preview-header-actions">
                  <span className="complete-label">COMPLETE</span>
                  <button
                    type="button"
                    className="ghost-button print-report-btn"
                    onClick={() => window.print()}
                  >
                    Print report
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="loading-orb">◈</div>

                <h3>Reading the signal</h3>

                {loadingSteps.map((step, index) => (
                  <div className="loading-step" key={step}>
                    <span>
                      {index < 2 ? '✓' : index === 2 ? '◉' : '○'}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            ) : result ? (
              <Result result={result} form={form} />
            ) : (
              <div className="empty-state">
                <div className="shield-mark">◈</div>

                <h3>Ready to analyze</h3>

                <p>
                  Submit a job posting to generate an explainable risk
                  assessment.
                </p>

                <span className="empty-hint">
                  Fraud + AI signals · human review
                </span>
              </div>
            )}
          </section>
        </div>
      )}

      {analyzerMode === 'batch' && (
        <BatchScreening
          onInspect={(row) => {
            setForm(row.payload);
            setResult(row.rawResult);
            setAnalyzerMode('single');
          }}
          onSaveHistoryItem={onSaveHistoryItem}
          API_BASE_URL={API_BASE_URL}
          setApiAvailable={setApiAvailable}
        />
      )}

      {analyzerMode === 'history' && (
        <RecentHistory
          history={history}
          onInspect={(item) => {
            setForm(item.payload);
            setResult(item.result);
            setAnalyzerMode('single');
          }}
          onClearHistory={onClearHistory}
          storageError={storageError}
        />
      )}
    </div>
  );
}


function Result({ result, form }) {
  const aiValue = result.ai_generation_probability;

  const aiStatus =
    aiValue == null
      ? 'UNAVAILABLE'
      : Number(aiValue) >= 0.75
        ? 'POSSIBLE AI-ASSISTED TEXT'
        : 'LOWER LIKELIHOOD';

  return (
    <div className="result-content">
      <div className="risk-header">
        <div>
          <span className="overline">RISK ASSESSMENT</span>

          <h3>
            {result.risk_level || 'REVIEW'} <span>risk</span>
          </h3>
        </div>

        <span className="result-mode">{result.mode}</span>
      </div>

      <div className="score-hero">
        <div className="hero-score">
          <ScoreRing
            value={result.fraud_probability}
            kind="fraud"
          />

          <strong>Fraud probability</strong>

          <span>
            {result.risk_level || 'REVIEW'} RISK
          </span>
        </div>

        <div className="ai-score">
          <span className="overline">AI-GENERATION</span>

          <strong>{percent(aiValue, 1)}</strong>

          <span>{aiStatus}</span>

          <p>
            Writing origin is analyzed independently from fraudulent
            intent.
          </p>
        </div>
      </div>

      <div className="result-note">
        AI-generated content does not inherently indicate fraudulent
        intent.
      </div>

      <div className="signals-grid">
        <SignalList
          title="Fraud signals"
          items={result.fraud_indicators}
          kind="fraud"
        />

        <SignalList
          title="AI writing signals"
          items={result.ai_indicators}
          kind="ai"
        />
      </div>

      <TextEvidencePanel
        text={form?.description}
        fraudIndicators={result.fraud_indicators}
      />

      {result.autopsy && <JobAutopsy autopsy={result.autopsy} />}

      <ShapPanel shap={result.shap} />
    </div>
  );
}

function JobAutopsy({ autopsy }) {
  const salary = autopsy.salary || {};
  const nodes = autopsy.evidence_graph?.nodes || [];
  const edges = autopsy.evidence_graph?.edges || [];
  const [filter, setFilter] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const filters = [
    ['all', 'All evidence'],
    ['fraud_signal', 'Fraud'],
    ['writing_signal', 'AI writing'],
    ['model_contribution', 'SHAP'],
    ['assessment', 'Decision'],
  ];
  const matchesFilter = (node) => filter === 'all' || node.kind === 'posting' || node.kind === 'assessment' || node.kind === filter;
  const visibleNodes = nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => matchesFilter(node));
  const selectedNode = nodes[selectedIndex];
  const connectedCount = edges.filter((edge) => edge.from === selectedIndex || edge.to === selectedIndex).length;
  const completedChecks = (autopsy.safety || []).filter((item) => item.status === 'present' || item.status === 'clear').length;

  return (
    <section className="autopsy-panel">
      <div className="autopsy-heading">
        <div><span className="overline">JOB AUTOPSY / EVIDENCE GRAPH</span><h3>Investigation report</h3><p>{autopsy.summary}</p></div>
        <span className="autopsy-mark">✳</span>
      </div>
      <div className="autopsy-grid">
        <article className="autopsy-card salary-intel">
          <div className="autopsy-card-top"><span className="overline">SALARY INTELLIGENCE</span><span className={`salary-state ${salary.status}`}>{salary.status === 'stated' ? 'DISCLOSED' : 'MISSING'}</span></div>
          <h4>{salary.status === 'stated' ? salary.listed_value : 'Not stated'}</h4>
          <p>{salary.format ? `${labelize(salary.format)}${salary.currency ? ` · ${salary.currency}` : ''}` : 'Compensation details unavailable'}</p>
          {salary.flagged_by_existing_signal && <b className="risk-chip">Existing salary signal flagged</b>}
          <details className="salary-explainer"><summary>How to read this</summary><small>{salary.note}</small></details>
        </article>
        <article className="autopsy-card safety-card">
          <div className="autopsy-card-top"><span className="overline">PRE-APPLICATION SAFETY</span><span className="checks-count">{completedChecks}/{(autopsy.safety || []).length} checks clear</span></div>
          <div className="safety-list">{(autopsy.safety || []).map((item) => (
            <div key={item.item} className={`safety-row ${item.status}`}><span>{item.status === 'present' || item.status === 'clear' ? '✓' : item.status === 'risk' ? '!' : '○'}</span><div><strong>{item.item}</strong><small>{item.detail}</small></div></div>
          ))}</div>
        </article>
      </div>
      <article className="autopsy-card evidence-card">
        <div className="evidence-head"><div className="card-heading"><span className="heading-icon">⌘</span><div><span className="overline">EVIDENCE GRAPH</span><h4>Explore what shaped the assessment</h4></div></div><span className="graph-count">{nodes.length} nodes · {edges.length} links</span></div>
        <div className="evidence-filters" role="group" aria-label="Filter evidence graph">
          {filters.map(([id, label]) => <button className={filter === id ? 'active' : ''} key={id} onClick={() => { setFilter(id); const first = id === 'all' ? 0 : nodes.findIndex((node) => node.kind === id); if (first >= 0) setSelectedIndex(first); }}>{label}</button>)}
        </div>
        <div className="evidence-graph">
          {visibleNodes.map(({ node, index }) => {
            const connected = index === selectedIndex || edges.some((edge) => (edge.from === selectedIndex && edge.to === index) || (edge.to === selectedIndex && edge.from === index));
            return <button type="button" aria-pressed={selectedIndex === index} className={`evidence-node ${node.kind} ${selectedIndex === index ? 'selected' : ''} ${connected ? 'connected' : 'dimmed'}`} key={`${node.kind}-${node.label}-${index}`} onClick={() => setSelectedIndex(index)}>
              <span>{node.kind === 'posting' ? 'JOB' : node.kind === 'assessment' ? 'DECISION' : node.kind === 'model_contribution' ? 'SHAP' : node.kind === 'writing_signal' ? 'AI STYLE' : 'EVIDENCE'}</span>
              <strong>{node.label}</strong><small>{node.detail}</small>
            </button>;
          })}
        </div>
        {selectedNode && <div className="selected-evidence"><div><span className="overline">SELECTED EVIDENCE</span><strong>{selectedNode.label}</strong><small>{selectedNode.detail}</small></div><span>{connectedCount} connected links</span></div>}
        <p className="fine-print">Select a node to highlight its relationships. AI-writing signals are independent of fraud risk; these signals support human review.</p>
      </article>
      <article className="autopsy-card consistency-card">
        <span className="overline">CROSS-SOURCE CONSISTENCY</span>
        {autopsy.comparisons?.length ? autopsy.comparisons.map((item, index) => <div className="comparison-result" key={`${item.platform}-${index}`}>
          <strong>{item.platform}</strong><span className={`comparison-status ${item.status}`}>{item.status === 'mismatch' ? 'Mismatch found' : item.status === 'consistent' ? 'Entered fields match' : 'Not enough shared details'}</span>
          {item.differences?.map((difference) => <p key={difference.field}><b>{difference.field}:</b> {difference.primary} <span>↔</span> {difference.other}</p>)}
          <small>{item.method}</small>
          {item.url && <small>{item.url}</small>}
        </div>) : <p className="muted">Add another listing in the input form to compare its supplied title, company, location, and salary.</p>}
        <div className="missing-info"><strong>Information still to verify</strong><span>{autopsy.missing_information?.length ? autopsy.missing_information.join(' · ') : 'Core posting details were supplied.'}</span></div>
      </article>
    </section>
  );
}

function Metric({ name, value }) {
  return (
    <div className="metric">
      <span>{name}</span>
      <strong>{value ?? '—'}</strong>
    </div>
  );
}

function Research({ research, mode }) {
  if (!research?.available) {
    return (
      <section className="surface unavailable-page">
        <div className="shield-mark">◈</div>

        <h2>Research results unavailable</h2>

        <p>
          {research?.status ||
            'Run the research training pipeline to load held-out evaluation evidence.'}
        </p>
      </section>
    );
  }

  const fraud = research.fraud_model?.metrics || {};
  const ai = research.ai_aware_experiments;
  const composition = research.ai_model?.category_counts || {};

  return (
    <div className="research-page">
      <div className="research-title">
        <div>
          <span className="overline">EVIDENCE CENTER</span>

          <h2>Model evaluation</h2>

          <p>
            Evaluation of the trained fraud-detection system on held-out
            data.
          </p>
        </div>

        <span className="mode-badge">
          <i />
          {mode}
        </span>
      </div>

      <div className="metrics-grid">
        {metrics.map((metric) => (
          <Metric
            key={metric}
            name={metric.replace('_', '-').toUpperCase()}
            value={
              typeof fraud[metric] === 'number'
                ? fraud[metric].toFixed(4)
                : fraud[metric]
            }
          />
        ))}
      </div>

      <div className="research-columns">
        <section className="surface research-card">
          <div className="card-heading">
            <span className="heading-icon">◆</span>

            <div>
              <span className="overline">
                DATASET COMPOSITION
              </span>

              <h3>EMSCAD / Fake Job Postings</h3>
            </div>
          </div>

          <div className="dataset-total">
            <strong>
              {research.dataset_rows?.toLocaleString()}
            </strong>

            <span>postings evaluated</span>
          </div>

          <div className="composition">
            <div>
              <span>
                Legitimate{' '}
                <b>
                  {research.legitimate_samples?.toLocaleString()}
                </b>
              </span>

              <i
                style={{
                  width: `${
                    research.dataset_rows
                      ? (research.legitimate_samples /
                          research.dataset_rows) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>

            <div>
              <span>
                Fraudulent{' '}
                <b>
                  {research.fraud_samples?.toLocaleString()}
                </b>
              </span>

              <i
                style={{
                  width: `${
                    research.dataset_rows
                      ? (research.fraud_samples /
                          research.dataset_rows) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="research-facts">
            <span>
              Train / test{' '}
              <b>
                {research.split?.train_size} /{' '}
                {research.split?.test_size}
              </b>
            </span>

            <span>
              Model <b>{research.fraud_model?.type}</b>
            </span>
          </div>
        </section>

        <section className="surface research-card">
          <div className="card-heading">
            <span className="heading-icon">⇄</span>

            <div>
              <span className="overline">
                MODEL COMPARISON
              </span>

              <h3>Baseline vs AI-aware</h3>
            </div>
          </div>

          {ai ? (
            <div className="comparison-table">
              <div className="table-row table-head">
                <span>Metric</span>
                <b>AI-aware</b>
                <b>Difference</b>
              </div>

              {metrics.map((metric) => (
                <div className="table-row" key={metric}>
                  <span>{metric.toUpperCase()}</span>

                  <b>{ai.metrics?.[metric] ?? '—'}</b>

                  <b
                    className={
                      Number(ai.difference?.[metric]) >= 0
                        ? 'delta-up'
                        : 'delta-down'
                    }
                  >
                    {ai.difference?.[metric] ?? '—'}
                  </b>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">
              AI-aware experiment unavailable.
            </p>
          )}
        </section>
      </div>

      <section className="surface research-card">
        <div className="card-heading">
          <span className="heading-icon">✦</span>

          <div>
            <span className="overline">
              CONTROLLED CORPUS
            </span>

            <h3>AI-generation study composition</h3>

            <p>
              Synthetic research corpus — not a substitute for
              real-world AI detection evidence.
            </p>
          </div>
        </div>

        <div className="corpus-grid">
          {[
            [
              'AI-generated legitimate',
              composition.ai_generated_legitimate,
            ],
            [
              'AI-generated fraudulent',
              composition.ai_generated_fraudulent,
            ],
            [
              'Human-written legitimate',
              composition.human_written_legitimate,
            ],
            [
              'Human-written fraudulent',
              composition.human_written_fraudulent,
            ],
          ].map(([name, value]) => (
            <div key={name}>
              <span>{name}</span>
              <strong>{value ?? '—'}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="method-strip">
        <span>METHOD</span>

        {[
          'Dataset',
          'Preprocessing',
          'Feature engineering',
          'Fraud model',
          'AI stylometry',
          'SHAP',
          'Risk assessment',
        ].map((item, index) => (
          <div key={item}>
            <b>0{index + 1}</b>
            {item}
            {index < 6 && <i>→</i>}
          </div>
        ))}
      </section>
    </div>
  );
}

function Overview({ modelInfo, setTab }) {
  return (
    <section className="overview-page">
      <div className="hero-panel">
        <div className="hero-copy">
          <span className="overline">
            JOB FRAUD INTELLIGENCE
          </span>

          <h2>
            Detect suspicious job postings{' '}
            <em>before they become a risk.</em>
          </h2>

          <p>
            JobShield separates fraudulent-intent signals from
            AI-generated writing signals so every assessment stays
            explainable, evidence-based, and human-reviewed.
          </p>

          <button
            className="primary-button"
            onClick={() => setTab('analyzer')}
          >
            Analyze a job <span>→</span>
          </button>
        </div>

        <div className="pipeline-visual">
          <span className="pipeline-label">
            ANALYSIS PIPELINE
          </span>

          {[
            ['01', 'JOB POSTING', 'Visible posting data'],
            [
              '02',
              'FEATURE EXTRACTION',
              'Text + structured signals',
            ],
            [
              '03',
              'DUAL MODELS',
              'Fraud + AI independently',
            ],
            [
              '04',
              'EXPLAINABLE RESULT',
              'Scores, signals, SHAP',
            ],
          ].map(([num, title, sub], index) => (
            <div className="pipeline-step" key={title}>
              <b>{num}</b>

              <div>
                <strong>{title}</strong>
                <small>{sub}</small>
              </div>

              {index < 3 && <i>↓</i>}
            </div>
          ))}
        </div>
      </div>

      <div className="overview-head">
        <div>
          <span className="overline">
            SYSTEM OVERVIEW
          </span>

          <h2>Evidence at a glance</h2>
        </div>

        <span className="muted">
          Live from research artifacts
        </span>
      </div>

      <div className="overview-metrics">
        <Metric
          name="Dataset"
          value={
            modelInfo?.dataset_rows?.toLocaleString() || '—'
          }
        />

        <Metric
          name="Fraud samples"
          value={
            modelInfo?.fraud_samples?.toLocaleString() || '—'
          }
        />

        <Metric
          name="Fraud model"
          value={modelInfo?.fraud_model?.type || '—'}
        />

        <Metric
          name="Explainability"
          value="SHAP"
        />
      </div>
    </section>
  );
}

function Methodology({ setTab }) {
  const steps = [
    [
      '01',
      'Job posting',
      'Visible text and structured details are reviewed before any request is sent.',
    ],
    [
      '02',
      'Feature extraction',
      'Text, contact, salary, company, and posting signals become model features.',
    ],
    [
      '03',
      'Independent models',
      'A fraud classifier and stylometric AI classifier produce separate probabilities.',
    ],
    [
      '04',
      'Explainable result',
      'Risk, indicators, and genuine SHAP contributions support human review.',
    ],
  ];

  return (
    <section className="methodology-page">
      <div className="methodology-intro">
        <span className="overline">
          ABOUT / METHODOLOGY
        </span>

        <h2>
          From posting to <em>evidence.</em>
        </h2>

        <p>
          JobShield is designed as a decision-support workflow:
          transparent enough for a mini-project viva, and disciplined
          enough not to treat AI-written text as proof of fraud.
        </p>

        <button
          className="primary-button"
          onClick={() => setTab('analyzer')}
        >
          Open analyzer <span>→</span>
        </button>
      </div>

      <div className="methodology-flow">
        {steps.map(([number, title, copy], index) => (
          <article className="methodology-step" key={title}>
            <span>{number}</span>

            <div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>

            {index < steps.length - 1 && <i>→</i>}
          </article>
        ))}
      </div>

      <div className="methodology-note">
        <strong>Research boundary</strong>

        <span>
          EMSCAD supplies the fraud labels. The controlled AI corpus
          supplies independent AI-generation labels. Neither signal is
          used as a shortcut for the other.
        </span>
      </div>
    </section>
  );
}

function PrintReport({ form, result }) {
  const generatedAt = useMemo(() => new Date().toLocaleString(), [result]);
  const aiValue = result.ai_generation_probability;
  const aiFormatted =
    aiValue == null ? 'Not available' : percent(aiValue, 1);

  const autopsy = result.autopsy || {};
  const safety = autopsy.safety || [];
  const salary = autopsy.salary || {};
  const missingInfo = autopsy.missing_information || [];
  const shap = result.shap;
  const shapFeatures = shap?.features || [];

  return (
    <div className="print-report-container" aria-hidden="true">
      <header className="print-header">
        <div className="print-brand">
          <h1>JobShield AI</h1>
          <span className="print-subtitle">Recruitment Fraud Intelligence Report</span>
        </div>
        <div className="print-meta">
          <div><strong>Generated:</strong> {generatedAt}</div>
          <div><strong>Analysis Mode:</strong> {result.mode || 'Standard'}</div>
        </div>
      </header>

      <section className="print-section">
        <h2 className="print-section-title">01 / Evaluated Job Posting Information</h2>
        <table className="print-table">
          <tbody>
            <tr>
              <th>Job Title</th>
              <td>{form?.title || 'Not provided'}</td>
              <th>Company Name</th>
              <td>{form?.company || 'Not provided'}</td>
            </tr>
            <tr>
              <th>Location</th>
              <td>{form?.location || 'Not provided'}</td>
              <th>Employment Type</th>
              <td>{form?.employment_type || 'Not provided'}</td>
            </tr>
            <tr>
              <th>Experience Level</th>
              <td>{form?.experience || 'Not provided'}</td>
              <th>Stated Salary</th>
              <td>{form?.salary || 'Not stated'}</td>
            </tr>
            <tr>
              <th>Contact Email</th>
              <td>{form?.email || 'Not provided'}</td>
              <th>Company Website</th>
              <td>{form?.website || 'Not provided'}</td>
            </tr>
            <tr>
              <th>Provided Application URL</th>
              <td colSpan="3">{form?.application_url || 'Not provided'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="print-section">
        <h2 className="print-section-title">02 / Assessment Summary (Independent Models)</h2>
        <div className="print-pillars-grid">
          <div className="print-pillar-card">
            <span className="print-pillar-tag">FRAUD RISK ASSESSMENT</span>
            <div className="print-pillar-metric">
              <span className="print-metric-value">{percent(result.fraud_probability, 1)}</span>
              <span className="print-metric-sub">{result.risk_level || 'REVIEW'} RISK LEVEL</span>
            </div>
            <p className="print-pillar-desc">
              Fraud model probability assessment based on structured signals and posting content.
            </p>
          </div>

          <div className="print-pillar-card">
            <span className="print-pillar-tag">AI-TEXT WRITING ANALYSIS (ESTIMATE)</span>
            <div className="print-pillar-metric">
              <span className="print-metric-value">{aiFormatted}</span>
            </div>
            <p className="print-pillar-desc">
              Stylometric text pattern probability. The AI-text score is an estimate and does not prove fraud or authorship. Writing style is analyzed independently from fraudulent intent.
            </p>
          </div>
        </div>
      </section>

      <section className="print-section">
        <h2 className="print-section-title">03 / Observed Indicators</h2>
        <div className="print-signals-grid">
          <div className="print-signal-box">
            <h3>Fraud Indicators ({result.fraud_indicators?.length || 0})</h3>
            {result.fraud_indicators?.length ? (
              <ul className="print-list">
                {result.fraud_indicators.map((ind, i) => (
                  <li key={i}>{ind}</li>
                ))}
              </ul>
            ) : (
              <p className="print-empty-note">No strong fraud indicators were detected in this posting.</p>
            )}
          </div>
          <div className="print-signal-box">
            <h3>AI Stylometric Writing Indicators ({result.ai_indicators?.length || 0})</h3>
            {result.ai_indicators?.length ? (
              <ul className="print-list">
                {result.ai_indicators.map((ind, i) => (
                  <li key={i}>{ind}</li>
                ))}
              </ul>
            ) : (
              <p className="print-empty-note">No prominent stylometric patterns detected.</p>
            )}
          </div>
        </div>
      </section>

      <section className="print-section">
        <h2 className="print-section-title">04 / Pre-Application Safety & Verification Checklist</h2>
        {safety.length > 0 ? (
          <table className="print-table print-checklist-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Safety Check</th>
                <th style={{ width: '20%' }}>Status</th>
                <th>Observed Detail</th>
              </tr>
            </thead>
            <tbody>
              {safety.map((item, idx) => (
                <tr key={idx}>
                  <td><strong>{item.item}</strong></td>
                  <td>
                    <span className={`print-check-badge badge-${item.status}`}>
                      {item.status === 'present' || item.status === 'clear'
                        ? 'PASS / CLEAR'
                        : item.status === 'risk'
                          ? 'ATTENTION NEEDED'
                          : 'OMITTED / MISSING'}
                    </span>
                  </td>
                  <td>{item.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="print-empty-note">Safety checklist details unavailable.</p>
        )}

        <div className="print-subbox">
          <h3>Missing or Unverified Information</h3>
          <p>
            {missingInfo.length > 0
              ? missingInfo.join(' · ')
              : 'Core posting details were supplied.'}
          </p>
          {salary.note && (
            <p className="print-salary-note">
              <strong>Salary status:</strong> {salary.status === 'stated' ? salary.listed_value : 'Not stated'}
              {salary.format ? ` (${labelize(salary.format)})` : ''} — {salary.note}
            </p>
          )}
        </div>
      </section>

      {shap?.available && shapFeatures.length > 0 && (
        <section className="print-section">
          <h2 className="print-section-title">05 / Model Feature Contributions (SHAP)</h2>
          <p className="print-shap-note">
            Top features influencing the fraud classification model. Positive values indicate features pushing toward fraud classification; negative values indicate features pushing away. Feature contributions indicate model behavior, not proof of causation or intent.
          </p>
          <table className="print-table print-shap-table">
            <thead>
              <tr>
                <th style={{ width: '45%' }}>Feature</th>
                <th style={{ width: '25%' }}>SHAP Value</th>
                <th style={{ width: '30%' }}>Model Influence</th>
              </tr>
            </thead>
            <tbody>
              {shapFeatures.map((item, idx) => {
                const val = Number(item.value);
                const isPositive = val >= 0;
                return (
                  <tr key={idx}>
                    <td><code>{labelize(String(item.feature || '').replace(/^.*__/, ''))}</code></td>
                    <td className={isPositive ? 'print-pos' : 'print-neg'}>
                      {isPositive ? '+' : ''}{val.toFixed(4)}
                    </td>
                    <td>
                      {isPositive ? 'Pushes toward fraud' : 'Pushes away from fraud'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <footer className="print-footer">
        <p className="print-disclaimer">
          <strong>Disclaimer:</strong> {result.disclaimer || 'Model outputs are decision-support signals and not definitive proof of fraud.'}
        </p>
        <p className="print-footer-sub">
          JobShield AI · Decision support only. AI-generated text does not inherently indicate fraudulent intent.
        </p>
      </footer>
    </div>
  );
}

function App() {
  const [tab, setTab] = useState('overview');
  const [form, setForm] = useState(emptyForm);
  const [result, setResult] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [research, setResearch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiAvailable, setApiAvailable] = useState(false);
  const [comparisonDraft, setComparisonDraft] = useState({ platform: '', title: '', company: '', location: '', salary: '', url: '' });
  const [activePreset, setActivePreset] = useState(null);

  /*
   * ============================================================
   * SCREENING HISTORY STATE (SESSION STORAGE)
   * ============================================================
   */
  const [history, setHistory] = useState(() => {
    const { items } = getSessionHistory();
    return items;
  });
  const [storageError, setStorageError] = useState(() => {
    const { error } = getSessionHistory();
    return error;
  });

  const addHistoryItem = (item) => {
    setHistory((prevHistory) => {
      const updated = [item, ...prevHistory.filter((h) => h.id !== item.id)].slice(0, MAX_HISTORY_ITEMS);
      const saveRes = saveSessionHistory(updated);
      if (!saveRes.success) {
        setStorageError(saveRes.error);
      } else {
        setStorageError(null);
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    clearSessionHistory();
    setHistory([]);
    setStorageError(null);
  };

  /*
   * ============================================================
   * BACKEND HEALTH / INITIAL DATA
   * ============================================================
   */
  useEffect(() => {
    let cancelled = false;

    const loadApiData = async () => {
      try {
        setError('');

        /*
         * Do the requests independently so that a failure of the
         * research endpoint does not make the entire API appear
         * disconnected if /api/model-info is working.
         */
        const [infoResponse, researchResponse] =
          await Promise.allSettled([
            fetch(`${API_BASE_URL}/api/model-info`),
            fetch(`${API_BASE_URL}/api/research-results`),
          ]);

        if (cancelled) return;

        let info = null;
        let researchData = null;
        let infoWorking = false;

        if (
          infoResponse.status === 'fulfilled' &&
          infoResponse.value.ok
        ) {
          try {
            info = await infoResponse.value.json();
            infoWorking = true;
          } catch (jsonError) {
            console.error(
              'Invalid model-info response:',
              jsonError
            );
          }
        }

        if (
          researchResponse.status === 'fulfilled' &&
          researchResponse.value.ok
        ) {
          try {
            researchData = await researchResponse.value.json();
          } catch (jsonError) {
            console.error(
              'Invalid research response:',
              jsonError
            );
          }
        }

        setModelInfo(info);
        setResearch(researchData);
        setApiAvailable(infoWorking);
      } catch (requestError) {
        if (cancelled) return;

        console.error('API connection error:', requestError);

        setModelInfo(null);
        setResearch(null);
        setApiAvailable(false);
      }
    };

    loadApiData();

    return () => {
      cancelled = true;
    };
  }, []);

  const mode = modelInfo?.mode || 'DEMO MODE';

  /*
   * ============================================================
   * DEMO DATA
   * ============================================================
   */
  const loadPreset = (presetId) => {
    const preset = DEMO_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setForm({
      ...emptyForm,
      ...preset.data,
    });
    setActivePreset(presetId);
    setResult(null);
    setError('');
    setComparisonDraft({ platform: '', title: '', company: '', location: '', salary: '', url: '' });
    setTab('analyzer');
  };

  const tryDemo = () => {
    loadPreset('suspicious');
  };

  /*
   * ============================================================
   * CLEAR
   * ============================================================
   */
  const clearForm = () => {
    setForm(emptyForm);
    setActivePreset(null);
    setResult(null);
    setError('');
    setComparisonDraft({ platform: '', title: '', company: '', location: '', salary: '', url: '' });
  };

  /*
   * ============================================================
   * ANALYZE
   * ============================================================
   */
  const analyze = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError('');
    setResult(null);

    try {
      if (API_BASE_URL === undefined || API_BASE_URL === null) {
        throw new Error('Backend API URL is not configured.');
      }

      /*
       * Basic validation before making the request.
       */
      if (!form.title.trim() && !form.description.trim()) {
        throw new Error(
          'Please enter a job title or description before analysis.'
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/api/analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...form,
            comparison_sources: Object.values(comparisonDraft).some((value) => value.trim()) ? [comparisonDraft] : [],
          }),
        }
      );

      let body = null;

      try {
        body = await response.json();
      } catch {
        throw new Error(
          `Backend returned HTTP ${response.status} with an invalid response.`
        );
      }

      if (!response.ok) {
        const detail =
          typeof body?.detail === 'string'
            ? body.detail
            : Array.isArray(body?.detail)
              ? body.detail
                  .map((item) =>
                    item?.msg || JSON.stringify(item)
                  )
                  .join(', ')
              : null;

        throw new Error(
          detail ||
            `Analysis failed (HTTP ${response.status}).`
        );
      }

      setResult(body);
      setApiAvailable(true);
      addHistoryItem({
        id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        dateTime: formatDateTime(new Date()),
        title: form.title?.trim() || 'Untitled posting',
        company: form.company?.trim() || '—',
        risk_level: body.risk_level || 'UNKNOWN',
        fraud_probability: body.fraud_probability,
        ai_generation_probability: body.ai_generation_probability,
        source: 'single',
        payload: { ...form },
        result: body,
      });
    } catch (requestError) {
      console.error('Analysis error:', requestError);

      const message = requestError?.message || '';

      if (
        message.includes('Failed to fetch') ||
        message.includes('NetworkError') ||
        message.includes('Load failed')
      ) {
        setApiAvailable(false);

        setError(
          `Cannot connect to backend. API: ${API_BASE_URL || 'local proxy (/api)'}`
        );
      } else {
        setError(
          message || 'Unable to reach the analysis backend.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="app-frame">
        <Sidebar
          tab={tab}
          setTab={setTab}
          mode={mode}
          apiAvailable={apiAvailable}
        />

        <main className="main-content">
          <Topbar
            mode={mode}
            tab={tab}
            onAnalyze={() => setTab('analyzer')}
          />

          {tab === 'overview' && (
            <Overview
              modelInfo={modelInfo}
              setTab={setTab}
            />
          )}

          {tab === 'analyzer' && (
            <Analyzer
              form={form}
              setForm={setForm}
              result={result}
              setResult={setResult}
              loading={loading}
              error={error}
              onAnalyze={analyze}
              onDemo={tryDemo}
              onClear={clearForm}
              comparisonDraft={comparisonDraft}
              setComparisonDraft={setComparisonDraft}
              activePreset={activePreset}
              onLoadPreset={loadPreset}
              API_BASE_URL={API_BASE_URL}
              setApiAvailable={setApiAvailable}
              history={history}
              onSaveHistoryItem={addHistoryItem}
              onClearHistory={handleClearHistory}
              storageError={storageError}
            />
          )}

          {tab === 'research' && (
            <Research
              research={research}
              mode={mode}
            />
          )}

          {tab === 'methodology' && (
            <Methodology setTab={setTab} />
          )}

          {tab === 'extension' && (
            <section className="surface extension-page">
              <span className="overline">
                BROWSER WORKFLOW
              </span>

              <h2>Analyze where the job lives.</h2>

              <p>
                The Manifest V3 extension extracts visible job
                information, lets you review it, and sends it only when
                you click Analyze. Dedicated adapters and a generic
                fallback keep the workflow ready for multiple portals.
              </p>

              <button
                className="primary-button"
                onClick={() => setTab('analyzer')}
              >
                Open analyzer <span>→</span>
              </button>
            </section>
          )}

          <footer>
            JobShield AI <span>·</span> Decision support only. AI-generated
            content does not inherently indicate fraudulent intent.
          </footer>
        </main>
      </div>

      {result && <PrintReport form={form} result={result} />}
    </>
  );
}

export default App;
