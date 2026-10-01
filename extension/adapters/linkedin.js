window.jobAnalyzerAdapters = window.jobAnalyzerAdapters || {};
window.jobAnalyzerAdapters.linkedin = function extractLinkedInJob() {
  const text = (selectors) => {
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (node?.textContent?.trim()) return node.textContent.trim();
    }
    return '';
  };
  const title = text([
    'h1.top-card-layout__title', '.jobs-unified-top-card__job-title',
    '.job-details-jobs-unified-top-card__job-title', 'main h1', 'h1',
  ]);
  const company = text([
    '.jobs-unified-top-card__company-name', '.topcard__org-name-link',
    '.job-details-jobs-unified-top-card__company-name', '[class*="company-name"]',
  ]);
  const description = text([
    '.jobs-description__content', '.jobs-box__html-content',
    '.jobs-description-content__text', '[class*="jobs-description"]',
  ]);
  const location = text([
    '.jobs-unified-top-card__workplace', '.jobs-unified-top-card__bullet',
    '.topcard__flavor--bullet', '[class*="top-card"] [class*="location"]',
  ]);
  const salary = text(['.jobs-unified-top-card__salary', '[class*="salary"]']);
  const employmentType = text(['.jobs-unified-top-card__employment-type', '[class*="employment-type"]']);
  const experience = text(['.jobs-unified-top-card__experience-level', '[class*="experience-level"]']);

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
