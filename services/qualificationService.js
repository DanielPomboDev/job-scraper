const fs = require("fs");
const path = require("path");
const { normalizeTitle } = require("../utils/normalize");

const rawDict = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../dictionaries/tesda_unified_job_qualifications.json"))
);

const jobTitleToQualification = {};

function buildDictionary() {
  for (const [category, jobs] of Object.entries(rawDict)) {
    for (const [jobName, jobData] of Object.entries(jobs)) {
      let allQualifications = [...(jobData.qualifications || [])];

      if (jobData.specialized_titles) {
        for (const spec of jobData.specialized_titles) {
          if (spec.qualifications) {
            allQualifications = [...new Set([...allQualifications, ...spec.qualifications])]; // Combine and deduplicate
          }
        }
      }

      const normalizedMainTitle = normalizeTitle(jobName);
      jobTitleToQualification[normalizedMainTitle] = {
        category: category,
        title: jobData.description || jobName,
        qual_codes: allQualifications,
        job_title: jobName,
        keywords: jobData.keywords || [],
        type: "main"
      };

      if (jobData.alternate_titles) {
        for (const altTitle of jobData.alternate_titles) {
          const normalizedAltTitle = normalizeTitle(altTitle);
          jobTitleToQualification[normalizedAltTitle] = {
            category: category,
            title: jobData.description || jobName,
            qual_codes: allQualifications,
            job_title: altTitle,
            keywords: jobData.keywords || [],
            type: "alternate"
          };
        }
      }

      if (jobData.specialized_titles) {
        for (const spec of jobData.specialized_titles) {
          const normalizedSpecTitle = normalizeTitle(spec.title);
          jobTitleToQualification[normalizedSpecTitle] = {
            category: category,
            title: spec.title,
            qual_codes: spec.qualifications || [],
            job_title: spec.title,
            keywords: spec.keywords || [],
            type: "specialized"
          };

          if (spec.alternate_titles) {
            for (const altTitle of spec.alternate_titles) {
              const normalizedAltTitle = normalizeTitle(altTitle);
              jobTitleToQualification[normalizedAltTitle] = {
                category: category,
                title: spec.title,
                qual_codes: spec.qualifications || [],
                job_title: altTitle,
                keywords: spec.keywords || [],
                type: "specialized_alternate"
              };
            }
          }
        }
      }
    }
  }
}

buildDictionary();

function fuzzyMatch(query, candidates, threshold = 0.3) {
  const normalizedQuery = normalizeTitle(query).toLowerCase();
  const queryWords = normalizedQuery.split(/\s+/);

  const potentialMatches = [];

  for (const [title, qualification] of Object.entries(candidates)) {
    const normalizedTitle = title.toLowerCase();
    const titleWords = normalizedTitle.split(/\s+/);

    let wordOverlap = 0;
    let exactWordMatches = 0; 

    for (const queryWord of queryWords) {
      if (normalizedTitle.includes(queryWord)) {
        wordOverlap++;
        if (titleWords.includes(queryWord)) {
          exactWordMatches++;
        }
      }
    }

    const overlapRatio = wordOverlap / queryWords.length;
    const exactMatchRatio = exactWordMatches / queryWords.length;

    let keywordMatch = 0;
    if (qualification.keywords) {
      for (const keyword of qualification.keywords) {
        if (query.toLowerCase().includes(keyword.toLowerCase())) {
          keywordMatch += 0.5; 
        }
      }
    }

    const hasQualifications = qualification.qual_codes && qualification.qual_codes.length > 0 ? 0.3 : 0;

    let weldingBoost = 0;
    const isQueryWeldingRelated = query.toLowerCase().includes('weld');
    const isTitleWeldingRelated = normalizedTitle.includes('weld');

    if (isQueryWeldingRelated && isTitleWeldingRelated) {
      weldingBoost = 0.4; 
    }

    const score = (overlapRatio * 0.5) + (exactMatchRatio * 0.5) + keywordMatch + hasQualifications + weldingBoost;

    if (score >= threshold) {
      potentialMatches.push({ qualification, score, title });
    }
  }

  potentialMatches.sort((a, b) => b.score - a.score);

  return potentialMatches.length > 0 ? potentialMatches[0] : null;
}

function getQualifications(title) {
  const normalized = normalizeTitle(title);

  if (jobTitleToQualification[normalized]) {
    const qualification = jobTitleToQualification[normalized];

    if (qualification.qual_codes && qualification.qual_codes.length > 0) {
      return {
        category: qualification.category,
        qualifications: qualification.qual_codes || [],
        originalJobTitle: title,
        mappedJobTitle: qualification.job_title,
        sector: qualification.category,
        qual_code: qualification.qual_codes && qualification.qual_codes.length > 0 ? qualification.qual_codes[0] : null,
        level: qualification.type
      };
    } else {
      const fuzzyResult = fuzzyMatch(title, jobTitleToQualification, 0.6); // Higher threshold

      if (fuzzyResult) {
        const { qualification } = fuzzyResult;
        return {
          category: qualification.category,
          qualifications: qualification.qual_codes || [],
          originalJobTitle: title,
          mappedJobTitle: qualification.job_title,
          sector: qualification.category,
          qual_code: qualification.qual_codes && qualification.qual_codes.length > 0 ? qualification.qual_codes[0] : null,
          level: qualification.type
        };
      } else {
        return {
          category: qualification.category,
          qualifications: qualification.qual_codes || [],
          originalJobTitle: title,
          mappedJobTitle: qualification.job_title,
          sector: qualification.category,
          qual_code: qualification.qual_codes && qualification.qual_codes.length > 0 ? qualification.qual_codes[0] : null,
          level: qualification.type
        };
      }
    }
  }

  const fuzzyResult = fuzzyMatch(title, jobTitleToQualification, 0.7); // Even higher threshold for general matching

  if (fuzzyResult) {
    const { qualification } = fuzzyResult;
    return {
      category: qualification.category,
      qualifications: qualification.qual_codes || [],
      originalJobTitle: title,
      mappedJobTitle: qualification.job_title,
      sector: qualification.category,
      qual_code: qualification.qual_codes && qualification.qual_codes.length > 0 ? qualification.qual_codes[0] : null,
      level: qualification.type
    };
  }

  return {
    originalJobTitle: title,
    mappedJobTitle: title,
    sector: "Unknown",
    qualifications: [],
    qual_code: null,
    level: null
  };
}

module.exports = { getQualifications };
