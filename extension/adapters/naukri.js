window.jobAnalyzerAdapters = window.jobAnalyzerAdapters || {};
window.jobAnalyzerAdapters.naukri = function extractNaukriJob() {
  const text = (selector) => document.querySelector(selector)?.textContent?.trim() || '';
  return {
    title: text('.styles_jd-header-title__rZwM1, h1'),
    company: text('.styles_jd-header-comp-name__MvqAI, .comp-name, [class*=company]'),
    description: text('.styles_JDC__dang-inner-html, .jd-desc, [class*=job-desc]'),
    location: text('.styles_jhc__location__W_pVs, .locWdth, [class*=location]'),
    salary: text('.styles_jhc__salary__jdfEC, .sal-wrap, [class*=salary]'),
    employment_type: text('[class*=employment], [class*=jobType]'),
    experience: text('.styles_jhc__exp__k_giM, [class*=experience]'),
    website: window.location.origin,
    application_url: window.location.href,
  };
};
