window.jobAnalyzerAdapters = window.jobAnalyzerAdapters || {};
window.jobAnalyzerAdapters.glassdoor = function extractGlassdoorJob() {
  const title = document.querySelector('.jobs-title, [data-test="job-title"]')?.textContent?.trim() || '';
  const company = document.querySelector('.employerName, [data-test="employer-name"]')?.textContent?.trim() || '';
  const description = document.querySelector('.jobDescriptionContent')?.textContent?.trim() || '';
  const location = document.querySelector('.location, [data-test="job-location"]')?.textContent?.trim() || '';
  const salary = document.querySelector('.salary')?.textContent?.trim() || '';

  return {
    title,
    company,
    description,
    location,
    salary,
    website: window.location.origin,
    application_url: window.location.href,
  };
};
