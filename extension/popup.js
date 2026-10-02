const API_BASE_URL =
  'https://ai-aware-recruitment-fraud-detection-api.onrender.com';

const escapeHtml = (value) => {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
};

const renderResults = (data) => {
  const resultsBox = document.getElementById('results');
  const statusText = document.getElementById('statusText');

  if (!data) {
    resultsBox.innerHTML = '<p>No result yet.</p>';
    return;
  }

  const fraudPercent = Math.round(
    (Number(data.fraud_probability) || 0) * 100
  );

  const aiPercent =
    data.ai_generation_probability == null
      ? 'N/A'
      : `${Math.round(
          Number(data.ai_generation_probability) * 100
        )}%`;

  statusText.textContent = `Risk level: ${
    data.risk_level || 'REVIEW'
  }${data.autopsy ? '' : ' · Update the API deployment to enable the full Job Autopsy report.'}`;

  const fraudIndicators = data.fraud_indicators || [];
  const aiIndicators = data.ai_indicators || [];
  const autopsy = data.autopsy || {};
  const safety = autopsy.safety || [];
  const comparisons = autopsy.comparisons || [];
  const evidenceNodes = autopsy.evidence_graph?.nodes || [];

  resultsBox.innerHTML = `
    <h3>Fraud score</h3>
    <div class="badge">${fraudPercent}%</div>

    <h3>AI-generation score</h3>
    <div class="badge">${aiPercent}</div>

    <h3>Fraud indicators</h3>
    <ul>
      ${
        fraudIndicators.length
          ? fraudIndicators
              .map(
                (item) =>
                  `<li>${escapeHtml(item)}</li>`
              )
              .join('')
          : '<li>No strong fraud indicators detected.</li>'
      }
    </ul>

    <h3>AI writing indicators</h3>
    <ul>
      ${
        aiIndicators.length
          ? aiIndicators
              .map(
                (item) =>
                  `<li>${escapeHtml(item)}</li>`
              )
              .join('')
          : '<li>No AI-writing indicators reported.</li>'
      }
    </ul>

    ${
      data.shap?.available
        ? `
          <h3>Explainability</h3>
          <ul>${(data.shap.features || []).slice(0, 5).map((item) => `<li>${escapeHtml(item.feature)}: ${Number(item.value) > 0 ? '+' : ''}${Number(item.value).toFixed(3)}</li>`).join('')}</ul>
        `
        : ''
    }

    ${autopsy.salary ? `
      <h3>Salary intelligence</h3>
      <p>${escapeHtml(autopsy.salary.listed_value || 'Salary not stated')} · ${escapeHtml(autopsy.salary.format || 'unavailable')}</p>
      <p class="disclaimer">${escapeHtml(autopsy.salary.note || '')}</p>
    ` : ''}

    ${safety.length ? `
      <h3>Pre-application safety</h3>
      <ul>${safety.map((item) => `<li>${escapeHtml(item.item)} — ${escapeHtml(item.detail)}</li>`).join('')}</ul>
    ` : ''}

    ${comparisons.length ? `
      <h3>Cross-source consistency</h3>
      ${comparisons.map((item) => `<p><strong>${escapeHtml(item.platform)}:</strong> ${item.differences?.length ? item.differences.map((difference) => `${escapeHtml(difference.field)} differs (${escapeHtml(difference.primary)} / ${escapeHtml(difference.other)})`).join('; ') : escapeHtml(item.status)}</p>`).join('')}
    ` : ''}

    ${evidenceNodes.length ? `
      <h3>Evidence graph</h3>
      <ul>${evidenceNodes.slice(0, 10).map((item) => `<li><strong>${escapeHtml(item.kind.replaceAll('_', ' '))}:</strong> ${escapeHtml(item.label)} — ${escapeHtml(item.detail)}</li>`).join('')}</ul>
    ` : ''}

    <p class="disclaimer">
      Model outputs are decision-support signals and are not
      definitive proof of fraud.
    </p>
  `;
};

let extractedJob = {};

const readReview = () =>
  Object.fromEntries(
    [
      'title',
      'company',
      'location',
      'salary',
      'website',
      'application_url',
      'description',
      'requirements',
      'benefits',
      'employment_type',
      'experience',
      'email',
    ].map((key) => {
      const element = document.getElementById(key);
      return [key, element ? element.value : ''];
    })
  );

document
  .getElementById('extractButton')
  .addEventListener('click', async () => {
    const statusText =
      document.getElementById('statusText');

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) {
        throw new Error(
          'Unable to identify the active tab.'
        );
      }

      const message = await chrome.tabs.sendMessage(
        tab.id,
        {
          type: 'EXTRACT_JOB',
        }
      );

      extractedJob = message?.job || {};

      if (
        !extractedJob.title &&
        !extractedJob.description
      ) {
        throw new Error(
          'No visible job information was found on this page.'
        );
      }

      Object.entries(extractedJob).forEach(
        ([key, value]) => {
          const field =
            document.getElementById(key);

          if (field) {
            field.value = value || '';
          }
        }
      );

      const review =
        document.getElementById('review');

      if (review) {
        review.hidden = false;
      }

      statusText.textContent =
        'Review the extracted fields before analysis.';
    } catch (error) {
      console.error(
        'Job extraction error:',
        error
      );

      statusText.textContent =
        error.message?.includes(
          'Receiving end does not exist'
        )
          ? 'Refresh the job page, then reopen the extension and try again.'
          : error.message ||
            'Unable to extract this page.';
    }
  });

document
  .getElementById('analyzeButton')
  .addEventListener('click', async () => {
    const statusText =
      document.getElementById('statusText');

    try {
      const payload = {
        ...extractedJob,
        ...readReview(),
      };
      const comparison = Object.fromEntries(
        ['platform', 'title', 'company', 'location', 'salary', 'url'].map((key) => [
          key,
          document.getElementById(`compare_${key}`)?.value?.trim() || '',
        ])
      );
      if (Object.values(comparison).some(Boolean)) {
        payload.comparison_sources = [comparison];
      }

      if (
        !payload.title &&
        !payload.description
      ) {
        throw new Error(
          'Add a job title or description before analysis.'
        );
      }

      const apiBaseUrl = (document.getElementById('apiUrl')?.value || API_BASE_URL).trim().replace(/\/$/, '');
      statusText.textContent = 'Connecting to the fraud analyzer...';

      const response = await fetch(
        `${apiBaseUrl}/api/analyze`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          `Backend returned HTTP ${response.status} with an invalid response.`
        );
      }

      if (!response.ok) {
        const detail =
          typeof data.detail === 'string'
            ? data.detail
            : Array.isArray(data.detail)
            ? data.detail
                .map(
                  (item) =>
                    item.msg ||
                    JSON.stringify(item)
                )
                .join(', ')
            : `Analysis failed with HTTP ${response.status}.`;

        throw new Error(detail);
      }

      renderResults(data);

      statusText.textContent =
        'Analysis completed successfully.';
    } catch (error) {
      console.error(
        'Analysis error:',
        error
      );

      const message =
        error.message || '';

      statusText.textContent =
        message.includes('Failed to fetch')
          ? 'Cannot reach the fraud analyzer API. Check the API URL and CORS configuration.'
          : message ||
            'Unable to analyze this page.';

      document.getElementById(
        'results'
      ).innerHTML = `
        <p>
          Unable to connect to the fraud analyzer.
          Make sure you have internet access and
          the deployed API is running.
        </p>
      `;
    }
  });
