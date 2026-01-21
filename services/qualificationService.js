const fs = require("fs");
const path = require("path");
const { normalizeTitle } = require("../utils/normalize");

// Load the simplified TESDA qualifications dictionary
const rawDict = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../dictionaries/tesda_simplified.json"))
);

// Create a mapping from normalized job titles to qualifications
const jobTitleToQualification = {};

function buildDictionary() {
  // Process each qualification in the simplified dictionary
  for (const qualification of rawDict.qualifications) {
    // Process each job title associated with this qualification
    for (const jobTitle of qualification.job_titles || []) {
      const normalizedTitle = normalizeTitle(jobTitle);

      // Store the qualification info for this job title
      jobTitleToQualification[normalizedTitle] = {
        sector: qualification.sector,
        title: qualification.title,
        qual_code: qualification.qual_code,
        level: qualification.level,
        competency_codes: qualification.competency_codes,
        job_title: jobTitle
      };
    }
  }
}

buildDictionary();

function getQualifications(title) {
  const normalized = normalizeTitle(title);

  // First, try exact match
  if (jobTitleToQualification[normalized]) {
    const qualification = jobTitleToQualification[normalized];
    return {
      category: qualification.sector,
      qualifications: qualification.competency_codes || [],
      originalJobTitle: title,
      mappedJobTitle: qualification.job_title,
      sector: qualification.sector,
      qual_code: qualification.qual_code,
      level: qualification.level
    };
  }

  // If no exact match, try to find similar titles using partial matching
  const matchedQualification = findSimilarQualification(normalized);

  if (matchedQualification) {
    return {
      category: matchedQualification.sector,
      qualifications: matchedQualification.competency_codes || [],
      originalJobTitle: title,
      mappedJobTitle: matchedQualification.job_title,
      sector: matchedQualification.sector,
      qual_code: matchedQualification.qual_code,
      level: matchedQualification.level
    };
  }

  // If no match found, return empty qualifications
  return {
    originalJobTitle: title,
    mappedJobTitle: title,
    sector: "Unknown",
    qualifications: [],
    qual_code: null,
    level: null
  };
}

// Helper function to find similar job titles using partial matching
function findSimilarQualification(normalizedTitle) {
  // Look for job titles that contain the search term as a substring
  for (const [storedTitle, qualification] of Object.entries(jobTitleToQualification)) {
    if (storedTitle.includes(normalizedTitle) || normalizedTitle.includes(storedTitle)) {
      return qualification;
    }
  }

  // If no substring match, try to find titles with common keywords
  const titleWords = normalizedTitle.split(/\s+/);

  for (const [storedTitle, qualification] of Object.entries(jobTitleToQualification)) {
    const storedWords = storedTitle.split(/\s+/);

    // Count common words between the search title and stored title
    const commonWords = titleWords.filter(word => storedWords.includes(word)).length;

    // If at least half of the words in the shorter phrase match, consider it a match
    const minWords = Math.min(titleWords.length, storedWords.length);
    if (minWords > 0 && commonWords >= Math.ceil(minWords / 2)) {
      return qualification;
    }
  }

  return null;
}

module.exports = { getQualifications };
