const renderResults = (data) => {
  const resultsBox = document.getElementById('results');
  const statusText = document.getElementById('statusText');

  if (!data) {
    resultsBox.innerHTML = '<p>No result yet.</p>';
    return;
  }

  statusText.textContent = `Risk level: ${data.risk_level || 'LOW'}`;
  resultsBox.innerHTML = `
    <h3>Fraud score</h3>
    <div class="badge">${Math.round((data.fraud_probability || 0) * 100)}%</div>
    <h3>AI score</h3>
    <div class="badge">${Math.round((data.ai_generation_probability || 0) * 100)}%</div>
    <ul>
      ${(data.fraud_indicators || []).map((item) => '<li>' + item + '</li>').join('') || '<li>No strong fraud indicators.</li>'}
    </ul>
  `;
};

let extractedJob = {};

const readReview = () => Object.fromEntries(
  ['title', 'company', 'location', 'salary', 'website', 'application_url', 'description']
    .map((key) => [key, document.getElementById(key).value]),
);

document.getElementById('extractButton').addEventListener('click', async () => {
  const statusText = document.getElementById('statusText');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const message = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_JOB' });
    extractedJob = message?.job || {};
    if (!extractedJob.title && !extractedJob.description) {
      throw new Error('No visible job information was found on this page.');
    }
    Object.entries(extractedJob).forEach(([key, value]) => {
      const field = document.getElementById(key);
      if (field) field.value = value || '';
    });
    document.getElementById('review').hidden = false;
    statusText.textContent = 'Review the extracted fields before analysis.';
  } catch (error) {
    statusText.textContent = error.message?.includes('Receiving end does not exist')
      ? 'Refresh the job page, then reopen the extension and try again.'
      : error.message || 'Unable to extract this page.';
  }
});

document.getElementById('analyzeButton').addEventListener('click', async () => {
  const statusText = document.getElementById('statusText');
  try {
    const payload = { ...extractedJob, ...readReview() };
    if (!payload.title && !payload.description) throw new Error('Add a title or description before analysis.');
    statusText.textContent = 'Sending reviewed content to the fraud analyzer...';
    const response = await fetch('http://localhost:8000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Backend returned HTTP ${response.status}.`);
    renderResults(await response.json());
  } catch (error) {
    statusText.textContent = error.message?.includes('Failed to fetch')
      ? 'Cannot reach the backend. Confirm that the API is running on port 8000.'
      : error.message || 'Unable to analyze this page.';
    document.getElementById('results').innerHTML = '<p>Check that the backend is running and the page contains visible job details.</p>';
  }
});
