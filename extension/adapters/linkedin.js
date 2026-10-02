window.jobAnalyzerAdapters = window.jobAnalyzerAdapters || {};

window.jobAnalyzerAdapters.linkedin = function extractLinkedInJob() {
  const clean = (value) =>
    String(value || '')
      .replace(/\u2026\s*\*?more/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

  const getMainText = () => {
    const main = document.querySelector('main');
    return main ? main.innerText || main.textContent || '' : '';
  };

  const getLines = () =>
    getMainText()
      .split('\n')
      .map((line) => clean(line))
      .filter(Boolean);

  const lines = getLines();

  // ------------------------------------------------------------
  // COMPANY
  // ------------------------------------------------------------

  const companyCandidates = [
    ...document.querySelectorAll('a[href*="/company/"]'),
  ]
    .map((node) => clean(node.innerText || node.textContent))
    .filter(Boolean);

  const company = companyCandidates[0] || '';

  // ------------------------------------------------------------
  // JOB TITLE
  // ------------------------------------------------------------

  let title = '';

  const titleSelectors = [
    '.job-details-jobs-unified-top-card__job-title',
    '.jobs-unified-top-card__job-title',
    '.top-card-layout__title',
    '.jobs-details-top-card__job-title',
    '[data-job-title]',
  ];

  for (const selector of titleSelectors) {
    const node = document.querySelector(selector);
    const value = clean(node?.innerText || node?.textContent);

    if (
      value &&
      value.toLowerCase() !== 'about the job' &&
      value.length >= 3 &&
      value.length <= 150
    ) {
      title = value;
      break;
    }
  }

  // Fallback: company -> job title
  if (!title && company) {
    const companyIndex = lines.findIndex(
      (line) => line.toLowerCase() === company.toLowerCase()
    );

    if (companyIndex !== -1) {
      for (let i = companyIndex + 1; i < lines.length; i++) {
        const candidate = lines[i];

        if (!candidate) continue;

        if (
          candidate.toLowerCase() === company.toLowerCase() ||
          candidate === 'About the job' ||
          candidate === 'Apply' ||
          candidate === 'Save' ||
          candidate === 'Full-time' ||
          candidate === 'Part-time' ||
          candidate === 'Contract' ||
          candidate === 'Internship'
        ) {
          continue;
        }

        if (
          /people clicked apply|responses managed|posted|ago|promoted/i.test(
            candidate
          )
        ) {
          continue;
        }

        title = candidate;
        break;
      }
    }
  }

  // ------------------------------------------------------------
  // LOCATION
  // ------------------------------------------------------------

  let location = '';

  if (title) {
    const titleIndex = lines.findIndex(
      (line) => line.toLowerCase() === title.toLowerCase()
    );

    if (titleIndex !== -1 && lines[titleIndex + 1]) {
      const metadataLine = lines[titleIndex + 1];
      location = clean(metadataLine.split('·')[0]);
    }
  }

  // ------------------------------------------------------------
  // EMPLOYMENT TYPE
  // ------------------------------------------------------------

  let employment_type = '';

  const employmentOptions = [
    'Full-time',
    'Part-time',
    'Contract',
    'Temporary',
    'Internship',
    'Volunteer',
    'Other',
  ];

  const foundEmployment = lines.find((line) =>
    employmentOptions.some(
      (option) => line.toLowerCase() === option.toLowerCase()
    )
  );

  if (foundEmployment) {
    employment_type = foundEmployment;
  }

  // ------------------------------------------------------------
  // WORK MODE
  // ------------------------------------------------------------

  const workMode = lines.find((line) =>
    ['On-site', 'Hybrid', 'Remote'].some(
      (option) => line.toLowerCase() === option.toLowerCase()
    )
  );

  // ------------------------------------------------------------
  // SALARY
  // ------------------------------------------------------------

  let salary = '';

  /*
   * Supported examples:
   *
   * ₹8,00,000 - ₹12,00,000
   * ₹8,00,000–₹12,00,000
   * ₹8L - ₹12L
   * ₹8 LPA - ₹12 LPA
   * 8 - 12 LPA
   * $80,000 - $100,000
   * $80K - $100K
   * €50,000 - €70,000
   * £40,000 - £60,000
   * ₹8,00,000 per year
   * $80,000/year
   * INR 8 LPA
   */

  const salaryPatterns = [
    // INR / ₹ salary ranges
    /₹\s*\d[\d,]*(?:\.\d+)?\s*(?:-|–|—|to)\s*₹?\s*\d[\d,]*(?:\.\d+)?/i,

    // USD salary ranges
    /\$\s*\d[\d,]*(?:\.\d+)?\s*(?:-|–|—|to)\s*\$?\s*\d[\d,]*(?:\.\d+)?/i,

    // EUR salary ranges
    /€\s*\d[\d,]*(?:\.\d+)?\s*(?:-|–|—|to)\s*€?\s*\d[\d,]*(?:\.\d+)?/i,

    // GBP salary ranges
    /£\s*\d[\d,]*(?:\.\d+)?\s*(?:-|–|—|to)\s*£?\s*\d[\d,]*(?:\.\d+)?/i,

    // ₹8L - ₹12L
    /₹\s*\d+(?:\.\d+)?\s*(?:L|LPA|lakh|lakhs)\s*(?:-|–|—|to)\s*₹?\s*\d+(?:\.\d+)?\s*(?:L|LPA|lakh|lakhs)?/i,

    // $80K - $100K
    /\$\s*\d+(?:\.\d+)?\s*K\s*(?:-|–|—|to)\s*\$?\s*\d+(?:\.\d+)?\s*K/i,

    // 8 LPA - 12 LPA
    /\b\d+(?:\.\d+)?\s*LPA\s*(?:-|–|—|to)\s*\d+(?:\.\d+)?\s*LPA\b/i,

    // 8 - 12 LPA
    /\b\d+(?:\.\d+)?\s*(?:-|–|—|to)\s*\d+(?:\.\d+)?\s*LPA\b/i,

    // ₹8L / ₹8 LPA
    /₹\s*\d+(?:\.\d+)?\s*(?:L|LPA|lakh|lakhs)\b/i,

    // $80K / $80M
    /\$\s*\d+(?:\.\d+)?\s*(?:K|M)\b/i,

    // ₹8,00,000 per year/month/hour
    /₹\s*\d[\d,]*(?:\.\d+)?\s*(?:\/|per\s*)?(?:year|yr|month|mo|hour|hr)\b/i,

    // $80,000 per year/month/hour
    /\$\s*\d[\d,]*(?:\.\d+)?\s*(?:\/|per\s*)?(?:year|yr|month|mo|hour|hr)\b/i,

    // INR 8 LPA
    /\b(?:INR|USD|EUR|GBP)\s*\d+(?:\.\d+)?\s*(?:LPA|K|M|lakh|lakhs)?\b/i,

    // Salary: ₹8,00,000
    /\b(?:salary|compensation|pay|package)\s*[:\-]?\s*(?:₹|\$|€|£|INR|USD|EUR|GBP)?\s*\d[\d,]*(?:\.\d+)?/i,
  ];

  /*
   * LinkedIn contains many unrelated numbers and promotional
   * messages. Therefore we explicitly ignore common UI text.
   */

  const ignoredSalaryText = [
    /get ai-powered advice/i,
    /more exclusive features/i,
    /get premium/i,
    /tailor my resume/i,
    /help me stand out/i,
    /use ai to assess/i,
    /job search faster/i,
    /access company insights/i,
    /strategic priorities/i,
    /headcount trends/i,
    /1-month free trial/i,
    /24\/7 support/i,
    /we'll send you a reminder/i,
    /followers/i,
    /people clicked apply/i,
    /connections work here/i,
    /school alumni/i,
  ];

  /*
   * First inspect the area immediately around the job title.
   * This is where LinkedIn normally displays salary information.
   */

  let salaryCandidates = [];

  if (title) {
    const titleIndex = lines.findIndex(
      (line) => line.toLowerCase() === title.toLowerCase()
    );

    if (titleIndex !== -1) {
      salaryCandidates.push(
        ...lines.slice(
          Math.max(0, titleIndex - 2),
          Math.min(lines.length, titleIndex + 20)
        )
      );
    }
  }

  /*
   * Fallback: inspect the complete visible job page.
   */

  salaryCandidates = [
    ...new Set([...salaryCandidates, ...lines]),
  ];

  for (const line of salaryCandidates) {
    const text = clean(line);

    if (!text) continue;

    // Ignore known LinkedIn UI/promotional text.
    if (ignoredSalaryText.some((pattern) => pattern.test(text))) {
      continue;
    }

    /*
     * A salary must contain a genuine numeric salary pattern.
     * This prevents normal LinkedIn text from becoming the salary.
     */

    if (salaryPatterns.some((pattern) => pattern.test(text))) {
      salary = text;
      break;
    }
  }

  // Never guess salary.
  if (!salary) {
    salary = '';
  }

  // ------------------------------------------------------------
  // DESCRIPTION
  // ------------------------------------------------------------

  let description = '';

  const mainText = getMainText();

  const descriptionMatch = mainText.match(
    /About the job\s*([\s\S]*?)(?:\nSet alert for similar jobs|\nAbout the company)/i
  );

  if (descriptionMatch) {
    description = clean(descriptionMatch[1]);
  }

  description = description
    .replace(/…\s*\*?more/gi, '')
    .trim();

  // Fallback to known LinkedIn description containers.
  if (!description) {
    const descriptionSelectors = [
      '#job-details',
      '.jobs-description__content',
      '.jobs-description-content__text',
      '.jobs-box__html-content',
      '[class*="jobs-description"]',
    ];

    for (const selector of descriptionSelectors) {
      const node = document.querySelector(selector);

      const value = clean(
        node?.innerText || node?.textContent
      );

      if (value.length >= 100) {
        description = value;
        break;
      }
    }
  }

  // ------------------------------------------------------------
  // APPLICATION URL
  // ------------------------------------------------------------

  const application_url = window.location.href;

  // ------------------------------------------------------------
  // RETURN
  // ------------------------------------------------------------

  return {
    title,
    company,
    location,
    salary,
    employment_type,
    experience: '',
    description,
    website: window.location.origin,
    application_url,
    work_mode: workMode || '',
  };
};