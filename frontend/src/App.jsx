import { useEffect, useMemo, useState } from 'react';
import './styles.css';

const emptyForm = {
  title: '', company: '', location: '', salary: '', employment_type: '',
  experience: '', website: '', application_url: '', email: '',
  description: '', requirements: '', benefits: '',
};

const percent = (value, digits = 1) => value == null ? 'N/A' : `${(Number(value) * 100).toFixed(digits)}%`;
const labelize = (value) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const metrics = ['accuracy', 'precision', 'recall', 'f1', 'roc_auc', 'pr_auc'];

function Icon({ children }) { return <span className="icon" aria-hidden="true">{children}</span>; }

function Sidebar({ tab, setTab, mode, apiAvailable }) {
  return <aside className="sidebar">
    <div className="brand"><div className="brand-orbit"><span>JS</span></div><div><strong>JobShield</strong><small>AI intelligence</small></div></div>
    <div className="sidebar-label">WORKSPACE</div>
    <nav className="side-nav" aria-label="Primary navigation">
      {[['overview', 'Overview', '⌂'], ['analyzer', 'Analyzer', '⌕'], ['research', 'Research', '⌁'], ['methodology', 'Methodology', '⊙'], ['extension', 'Extension', '⇱']].map(([id, label, icon]) =>
        <button key={id} className={tab === id ? 'side-link active' : 'side-link'} onClick={() => setTab(id)}><Icon>{icon}</Icon><span>{label}</span>{id === 'analyzer' && <b>LIVE</b>}</button>)}
    </nav>
    <div className="sidebar-bottom"><div className="status-card"><span className={`status-dot ${apiAvailable ? '' : 'offline'}`} /><div><strong>System status</strong><small>{apiAvailable ? 'API connected' : 'API unavailable'}</small></div></div><small className="version">v1.0 · {mode === 'RESEARCH MODE' ? 'research build' : 'demo build'}</small></div>
  </aside>;
}

function Topbar({ mode, tab, onAnalyze }) {
  const section = tab === 'overview' ? 'OVERVIEW' : tab === 'research' ? 'RESEARCH' : tab === 'methodology' ? 'METHODOLOGY' : tab === 'extension' ? 'EXTENSION' : 'ANALYZER';
  return <header className="topbar"><div><span className="breadcrumb">JOBSHIELD / <strong>{section}</strong></span><h1>Recruitment fraud intelligence</h1></div><div className="top-actions"><span className="mode-badge"><i />{mode}</span><button className="top-analyze" onClick={onAnalyze}>New analysis <span>↗</span></button></div></header>;
}

function ScoreRing({ value, kind }) {
  const numeric = value == null ? 0 : Number(value);
  return <div className={`score-ring ${kind}`} style={{ '--score': `${numeric * 360}deg` }}><div><strong>{percent(value, 1)}</strong><small>{kind === 'fraud' ? 'fraud probability' : 'AI-generation'}</small></div></div>;
}

function SignalList({ title, items, kind }) {
  return <section className={`signal-card ${kind}`}><div className="card-heading"><span className="heading-icon">{kind === 'fraud' ? '!' : '✦'}</span><div><span className="overline">{kind === 'fraud' ? 'FRAUD ANALYSIS' : 'WRITING ANALYSIS'}</span><h3>{title}</h3></div></div>{items?.length ? <ul>{items.map((item) => <li key={item}><span>↳</span>{item}</li>)}</ul> : <p className="muted">No indicators reported for this posting.</p>}</section>;
}

function ShapPanel({ shap }) {
  if (!shap?.available) return <section className="shap-card unavailable"><div className="card-heading"><span className="heading-icon">◌</span><div><span className="overline">EXPLAINABILITY</span><h3>Model contributions</h3></div></div><p>{shap?.message || 'SHAP explanation unavailable.'}</p></section>;
  const max = Math.max(...(shap.features || []).map((item) => Math.abs(Number(item.value))), 0.01);
  return <section className="shap-card"><div className="card-heading"><span className="heading-icon">◌</span><div><span className="overline">EXPLAINABILITY</span><h3>Why did the model reach this assessment?</h3><p>Feature contributions from the trained fraud model.</p></div></div><div className="shap-list">{shap.features.map((item) => <div className="shap-row" key={item.feature}><span className="shap-name" title={item.feature}>{labelize(item.feature.replace(/^.*__/, ''))}</span><div className="shap-track"><i className={item.value >= 0 ? 'positive' : 'negative'} style={{ width: `${Math.abs(item.value) / max * 100}%` }} /></div><strong className={item.value >= 0 ? 'positive-text' : 'negative-text'}>{item.value > 0 ? '+' : ''}{Number(item.value).toFixed(3)}</strong></div>)}</div><div className="shap-legend"><span><i className="positive" /> pushes toward fraud</span><span><i className="negative" /> pushes away from fraud</span></div><p className="fine-print">Contributions indicate model behavior, not proof of causation or intent.</p></section>;
}

function Analyzer({ form, setForm, result, loading, error, onAnalyze, onDemo, onClear }) {
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const loadingSteps = useMemo(() => ['Extracting posting signals', 'Scoring fraud indicators', 'Analyzing writing patterns', 'Preparing explanation'], []);
  return <div className="analyzer-grid">
    <section className="surface editor-card"><div className="section-head"><div><span className="overline">01 / INPUT</span><h2>Job posting</h2><p>Review the visible information before sending it for analysis.</p></div><span className="live-label"><i />USER-TRIGGERED</span></div><form onSubmit={onAnalyze}><div className="field-grid">{['title', 'company', 'location', 'salary', 'employment_type', 'experience', 'website', 'application_url'].map((field) => <label className="field" key={field}><span>{labelize(field)}</span><input name={field} value={form[field]} onChange={update} placeholder={`Enter ${labelize(field).toLowerCase()}`} /></label>)}</div><label className="field field-wide editor-field"><span>Description <em>{form.description.length} characters</em></span><textarea name="description" value={form.description} onChange={update} rows="9" placeholder="Paste the visible job description here..." /></label><div className="optional-row"><label className="field"><span>Requirements <em>optional</em></span><textarea name="requirements" value={form.requirements} onChange={update} rows="3" /></label><label className="field"><span>Benefits <em>optional</em></span><textarea name="benefits" value={form.benefits} onChange={update} rows="3" /></label></div><div className="form-actions"><button className="ghost-button" type="button" onClick={onDemo}>Load demo</button><button className="ghost-button" type="button" onClick={onClear}>Clear</button><button className="primary-button" disabled={loading}>{loading ? 'Analyzing…' : 'Analyze job'} <span>→</span></button></div>{error && <p className="error-text" role="alert"><Icon>!</Icon>{error}</p>}</form></section>
    <section className="surface preview-card"><div className="section-head"><div><span className="overline">02 / OUTPUT</span><h2>Analysis preview</h2></div>{result && <span className="complete-label">COMPLETE</span>}</div>{loading ? <div className="loading-state"><div className="loading-orb">◈</div><h3>Reading the signal</h3>{loadingSteps.map((step, index) => <div className="loading-step" key={step}><span>{index < 2 ? '✓' : index === 2 ? '◉' : '○'}</span>{step}</div>)}</div> : result ? <Result result={result} /> : <div className="empty-state"><div className="shield-mark">⌾</div><h3>Ready to analyze</h3><p>Submit a job posting to generate an explainable risk assessment.</p><span className="empty-hint">Fraud + AI signals · human review</span></div>}</section>
  </div>;
}

function Result({ result }) {
  const aiValue = result.ai_generation_probability;
  const aiStatus = aiValue == null ? 'UNAVAILABLE' : Number(aiValue) >= .75 ? 'POSSIBLE AI-ASSISTED TEXT' : 'LOWER LIKELIHOOD';
  return <div className="result-content"><div className="risk-header"><div><span className="overline">RISK ASSESSMENT</span><h3>{result.risk_level || 'REVIEW'} <span>risk</span></h3></div><span className="result-mode">{result.mode}</span></div><div className="score-hero"><div className="hero-score"><ScoreRing value={result.fraud_probability} kind="fraud" /><strong>Fraud probability</strong><span>{result.risk_level || 'REVIEW'} RISK</span></div><div className="ai-score"><span className="overline">AI-GENERATION</span><strong>{percent(aiValue, 1)}</strong><span>{aiStatus}</span><p>Writing origin is analyzed independently from fraudulent intent.</p></div></div><div className="result-note">AI-generated content does not inherently indicate fraudulent intent.</div><div className="signals-grid"><SignalList title="Fraud signals" items={result.fraud_indicators} kind="fraud" /><SignalList title="AI writing signals" items={result.ai_indicators} kind="ai" /></div><ShapPanel shap={result.shap} /></div>;
}

function Metric({ name, value }) { return <div className="metric"><span>{name}</span><strong>{value ?? '—'}</strong></div>; }

function Research({ research, mode }) {
  if (!research?.available) return <section className="surface unavailable-page"><div className="shield-mark">⌁</div><h2>Research results unavailable</h2><p>{research?.status || 'Run the research training pipeline to load held-out evaluation evidence.'}</p></section>;
  const fraud = research.fraud_model?.metrics || {};
  const ai = research.ai_aware_experiments;
  const composition = research.ai_model?.category_counts || {};
  return <div className="research-page"><div className="research-title"><div><span className="overline">EVIDENCE CENTER</span><h2>Model evaluation</h2><p>Evaluation of the trained fraud-detection system on held-out data.</p></div><span className="mode-badge"><i />{mode}</span></div><div className="metrics-grid">{metrics.map((metric) => <Metric key={metric} name={metric.replace('_', '-').toUpperCase()} value={typeof fraud[metric] === 'number' ? fraud[metric].toFixed(4) : fraud[metric]} />)}</div><div className="research-columns"><section className="surface research-card"><div className="card-heading"><span className="heading-icon">▦</span><div><span className="overline">DATASET COMPOSITION</span><h3>EMSCAD / Fake Job Postings</h3></div></div><div className="dataset-total"><strong>{research.dataset_rows?.toLocaleString()}</strong><span>postings evaluated</span></div><div className="composition"><div><span>Legitimate <b>{research.legitimate_samples?.toLocaleString()}</b></span><i style={{ width: `${(research.legitimate_samples / research.dataset_rows) * 100}%` }} /></div><div><span>Fraudulent <b>{research.fraud_samples?.toLocaleString()}</b></span><i style={{ width: `${(research.fraud_samples / research.dataset_rows) * 100}%` }} /></div></div><div className="research-facts"><span>Train / test <b>{research.split?.train_size} / {research.split?.test_size}</b></span><span>Model <b>{research.fraud_model?.type}</b></span></div></section><section className="surface research-card"><div className="card-heading"><span className="heading-icon">⇄</span><div><span className="overline">MODEL COMPARISON</span><h3>Baseline vs AI-aware</h3></div></div>{ai ? <div className="comparison-table"><div className="table-row table-head"><span>Metric</span><b>AI-aware</b><b>Difference</b></div>{metrics.map((metric) => <div className="table-row" key={metric}><span>{metric.toUpperCase()}</span><b>{ai.metrics?.[metric] ?? '—'}</b><b className={Number(ai.difference?.[metric]) >= 0 ? 'delta-up' : 'delta-down'}>{ai.difference?.[metric] ?? '—'}</b></div>)}</div> : <p className="muted">AI-aware experiment unavailable.</p>}</section></div><section className="surface research-card"><div className="card-heading"><span className="heading-icon">✦</span><div><span className="overline">CONTROLLED CORPUS</span><h3>AI-generation study composition</h3><p>Synthetic research corpus — not a substitute for real-world AI detection evidence.</p></div></div><div className="corpus-grid">{[['AI-generated legitimate', composition.ai_generated_legitimate], ['AI-generated fraudulent', composition.ai_generated_fraudulent], ['Human-written legitimate', composition.human_written_legitimate], ['Human-written fraudulent', composition.human_written_fraudulent]].map(([name, value]) => <div key={name}><span>{name}</span><strong>{value ?? '—'}</strong></div>)}</div></section><section className="method-strip"><span>METHOD</span>{['Dataset', 'Preprocessing', 'Feature engineering', 'Fraud model', 'AI stylometry', 'SHAP', 'Risk assessment'].map((item, index) => <div key={item}><b>0{index + 1}</b>{item}{index < 6 && <i>→</i>}</div>)}</section></div>;
}

function Overview({ modelInfo, setTab }) {
  return <section className="overview-page"><div className="hero-panel"><div className="hero-copy"><span className="overline">JOB FRAUD INTELLIGENCE</span><h2>Detect suspicious job postings <em>before they become a risk.</em></h2><p>JobShield separates fraudulent-intent signals from AI-generated writing signals so every assessment stays explainable, evidence-based, and human-reviewed.</p><button className="primary-button" onClick={() => setTab('analyzer')}>Analyze a job <span>→</span></button></div><div className="pipeline-visual"><span className="pipeline-label">ANALYSIS PIPELINE</span>{[['01', 'JOB POSTING', 'Visible posting data'], ['02', 'FEATURE EXTRACTION', 'Text + structured signals'], ['03', 'DUAL MODELS', 'Fraud + AI independently'], ['04', 'EXPLAINABLE RESULT', 'Scores, signals, SHAP']].map(([num, title, sub], index) => <div className="pipeline-step" key={title}><b>{num}</b><div><strong>{title}</strong><small>{sub}</small></div>{index < 3 && <i>↓</i>}</div>)}</div></div><div className="overview-head"><div><span className="overline">SYSTEM OVERVIEW</span><h2>Evidence at a glance</h2></div><span className="muted">Live from research artifacts</span></div><div className="overview-metrics"><Metric name="Dataset" value={modelInfo?.dataset_rows?.toLocaleString() || '—'} /><Metric name="Fraud samples" value={modelInfo?.fraud_samples?.toLocaleString() || '—'} /><Metric name="Fraud model" value={modelInfo?.fraud_model?.type || '—'} /><Metric name="Explainability" value="SHAP" /></div></section>;
}

function Methodology({ setTab }) {
  const steps = [
    ['01', 'Job posting', 'Visible text and structured details are reviewed before any request is sent.'],
    ['02', 'Feature extraction', 'Text, contact, salary, company, and posting signals become model features.'],
    ['03', 'Independent models', 'A fraud classifier and stylometric AI classifier produce separate probabilities.'],
    ['04', 'Explainable result', 'Risk, indicators, and genuine SHAP contributions support human review.'],
  ];
  return <section className="methodology-page"><div className="methodology-intro"><span className="overline">ABOUT / METHODOLOGY</span><h2>From posting to <em>evidence.</em></h2><p>JobShield is designed as a decision-support workflow: transparent enough for a mini-project viva, and disciplined enough not to treat AI-written text as proof of fraud.</p><button className="primary-button" onClick={() => setTab('analyzer')}>Open analyzer <span>→</span></button></div><div className="methodology-flow">{steps.map(([number, title, copy], index) => <article className="methodology-step" key={title}><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div>{index < steps.length - 1 && <i>→</i>}</article>)}</div><div className="methodology-note"><strong>Research boundary</strong><span>EMSCAD supplies the fraud labels. The controlled AI corpus supplies independent AI-generation labels. Neither signal is used as a shortcut for the other.</span></div></section>;
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
  useEffect(() => { Promise.all([fetch('/api/model-info'), fetch('/api/research-results')]).then(async ([info, results]) => { if (!info.ok || !results.ok) throw new Error('API unavailable'); setModelInfo(await info.json()); setResearch(await results.json()); setApiAvailable(true); }).catch(() => { setModelInfo(null); setResearch(null); setApiAvailable(false); }); }, []);
  const mode = modelInfo?.mode || 'DEMO MODE';
  const tryDemo = () => { setForm({ ...emptyForm, title: 'Urgent Hiring Data Entry Clerk', company: 'FastCashNow', location: 'Remote', salary: '$2000 - $5000 per day', email: 'applyfastcashnow@gmail.com', website: 'https://fastcashnow.xyz', description: 'Urgent hiring now! Work from home and start today. Applicants must pay a registration fee and send bank details to begin onboarding.' }); setTab('analyzer'); };
  const clearForm = () => { setForm(emptyForm); setResult(null); setError(''); };
  const analyze = async (event) => { event.preventDefault(); setLoading(true); setError(''); setResult(null); try { const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const body = await response.json(); if (!response.ok) throw new Error(body.detail?.[0]?.msg || body.detail || `Analysis failed (HTTP ${response.status}).`); setResult(body); } catch (requestError) { setError(requestError.message || 'Unable to reach the analysis backend.'); } finally { setLoading(false); } };
  return <div className="app-frame"><Sidebar tab={tab} setTab={setTab} mode={mode} apiAvailable={apiAvailable} /><main className="main-content"><Topbar mode={mode} tab={tab} onAnalyze={() => setTab('analyzer')} />{tab === 'overview' && <Overview modelInfo={modelInfo} setTab={setTab} apiAvailable={apiAvailable} />}{tab === 'analyzer' && <Analyzer form={form} setForm={setForm} result={result} loading={loading} error={error} onAnalyze={analyze} onDemo={tryDemo} onClear={clearForm} />}{tab === 'research' && <Research research={research} mode={mode} />}{tab === 'methodology' && <Methodology setTab={setTab} />}{tab === 'extension' && <section className="surface extension-page"><span className="overline">BROWSER WORKFLOW</span><h2>Analyze where the job lives.</h2><p>The Manifest V3 extension extracts visible job information, lets you review it, and sends it only when you click Analyze. Dedicated adapters and a generic fallback keep the workflow ready for multiple portals.</p><button className="primary-button" onClick={() => setTab('analyzer')}>Open analyzer <span>→</span></button></section>}<footer>JobShield AI <span>·</span> Decision support only. AI-generated content does not inherently indicate fraudulent intent.</footer></main></div>;
}

export default App;
