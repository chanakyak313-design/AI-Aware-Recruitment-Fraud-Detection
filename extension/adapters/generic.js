window.jobAnalyzerAdapters = window.jobAnalyzerAdapters || {};
window.jobAnalyzerAdapters.generic = function extractGenericJob() {
  const pickText = (selectors) => {
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (node && node.textContent && node.textContent.trim()) {
        return node.textContent.trim();
      }
    }
    return '';
  };

  return {
    title: pickText(['h1', 'h2.job-title', '[data-testid="job-title"]', '.job-title']),
    company: pickText(['[data-company-name]', '.company-name', '.job-company', '[data-testid="company-name"]']),
    description: pickText(['article', '.job-description', '[data-testid="job-description"]', '.description']),
    location: pickText(['[data-location]', '.job-location', '[data-testid="job-location"]']),
    salary: pickText(['[data-salary]', '.salary', '.job-salary']),
    employment_type: pickText(['[data-employment-type]', '.employment-type']),
    experience: pickText(['[data-experience]', '.experience']),
    website: window.location.origin,
    application_url: window.location.href,
  };
};
