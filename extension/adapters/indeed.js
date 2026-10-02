window.jobAnalyzerAdapters = window.jobAnalyzerAdapters || {};
window.jobAnalyzerAdapters.indeed = function extractIndeedJob() {
  const title = document.querySelector('.jobsearch-JobInfoHeader-title, [data-testid="jobsearch-jobtitle"]')?.textContent?.trim() || '';
  const company = document.querySelector('.jobsearch-InlineCompanyRating, [data-testid="company-name"]')?.textContent?.trim() || '';
  const description = document.querySelector('.jobsearch-jobDescriptionText')?.textContent?.trim() || '';
  const location = document.querySelector('.jobsearch-JobInfoHeader-subtitle, [data-testid="job-location"]')?.textContent?.trim() || '';
  const salary = document.querySelector('.salary-snippet-container')?.textContent?.trim() || '';
  const experience = document.querySelector('.attribute_snippet')?.textContent?.trim() || '';

  return {
    title,
    company,
    description,
    location,
    salary,
    experience,
    website: window.location.origin,
    application_url: window.location.href,
  };
};
