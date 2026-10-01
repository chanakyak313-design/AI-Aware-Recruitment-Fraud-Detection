const extractText = (selector, fallback = '') => {
  const node = document.querySelector(selector);
  return node ? node.textContent.trim() : fallback;
};

const genericExtract = () => {
  const title = extractText('h1, h2.job-title, [data-testid="job-title"], .job-title', '');
  const company = extractText('[data-company-name], .company-name, .job-company, [data-testid="company-name"]', '');
  const description = extractText('article, .job-description, [data-testid="job-description"], .description, main', '');
  const location = extractText('[data-location], .job-location, [data-testid="job-location"]', '');
  const salary = extractText('[data-salary], .salary, .job-salary', '');
  const employmentType = extractText('[data-employment-type], .employment-type', '');
  const experience = extractText('[data-experience], .experience', '');

  return {
    title,
    company,
    description,
    location,
    salary,
    employment_type: employmentType,
    experience,
    website: window.location.origin,
    application_url: window.location.href,
  };
};

const getCurrentJobData = () => {
  const host = window.location.hostname.toLowerCase();
  const adapters = window.jobAnalyzerAdapters || {};
  const adapter = host.endsWith('linkedin.com') ? adapters.linkedin
    : host.endsWith('indeed.com') ? adapters.indeed
      : host.endsWith('glassdoor.com') ? adapters.glassdoor
        : host.endsWith('naukri.com') ? adapters.naukri
        : adapters.generic;
  const platformJob = adapter ? adapter() : {};
  const genericJob = genericExtract();
  const merged = Object.fromEntries(
    Object.keys(genericJob).map((key) => [key, platformJob[key] || genericJob[key] || '']),
  );
  return merged;
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_JOB') {
    sendResponse({ job: getCurrentJobData() });
  }
  return true;
});
