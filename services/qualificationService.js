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
      const normalizedMainTitle = normalizeTitle(jobName);
      jobTitleToQualification[normalizedMainTitle] = {
        category: category,
        title: jobData.description || jobName,
        qual_codes: jobData.qualifications || [],
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
            qual_codes: jobData.qualifications || [],
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

function getQualifications(title) {
  const normalized = normalizeTitle(title);

  const genericTerms = ['mechanic', 'technician', 'operator', 'worker', 'assistant', 'aide', 'supervisor'];
  if (genericTerms.includes(normalized)) {
    const potentialMatches = [];
    for (const [storedTitle, qualification] of Object.entries(jobTitleToQualification)) {
      if (storedTitle.includes(normalized) && storedTitle !== normalized) {
        const wordCount = storedTitle.split(/\s+/).length;

        let sectorScore = 0;
        if (normalized === 'mechanic') {
          if (qualification.category.includes('Automotive')) {
            sectorScore = 2; 
          } else if (qualification.category.includes('Agriculture')) {
            sectorScore = -1; 
          }
        } else if (normalized === 'technician' &&
                  (qualification.category.includes('Electronics') || qualification.category.includes('Electrical'))) {
          sectorScore = 1.5; 
        }

        potentialMatches.push({
          qualification,
          specificity: wordCount + sectorScore, 
          storedTitle
        });
      }
    }

    if (potentialMatches.length > 0) {
      potentialMatches.sort((a, b) => b.specificity - a.specificity);
      const bestMatch = potentialMatches[0];
      return {
        category: bestMatch.qualification.category,
        qualifications: bestMatch.qualification.qual_codes || [],
        originalJobTitle: title,
        mappedJobTitle: bestMatch.qualification.job_title,
        sector: bestMatch.qualification.category,
        qual_code: bestMatch.qualification.qual_codes && bestMatch.qualification.qual_codes.length > 0 ? bestMatch.qualification.qual_codes[0] : null,
        level: bestMatch.qualification.type
      };
    }
  }

  if (jobTitleToQualification[normalized]) {
    const qualification = jobTitleToQualification[normalized];
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

  const matchedQualification = findSimilarQualification(normalized, title);

  if (matchedQualification) {

    const originalWords = normalized.split(/\s+/);
    const matchedWords = normalizeTitle(matchedQualification.job_title).split(/\s+/);

    const matchingWords = originalWords.filter(word => matchedWords.includes(word));
    const wordMatchRatio = matchingWords.length / originalWords.length;

    if (wordMatchRatio >= 0.3 || (matchedQualification.keywords && matchedQualification.keywords.some(kw =>
        title.toLowerCase().includes(kw.toLowerCase())))) {
      return {
        category: matchedQualification.category,
        qualifications: matchedQualification.qual_codes || [],
        originalJobTitle: title,
        mappedJobTitle: matchedQualification.job_title,
        sector: matchedQualification.category,
        qual_code: matchedQualification.qual_codes && matchedQualification.qual_codes.length > 0 ? matchedQualification.qual_codes[0] : null,
        level: matchedQualification.type
      };
    }
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

function findSimilarQualification(normalizedTitle, originalTitle) {
  const genericTerms = ['supervisor', 'worker', 'technician', 'operator', 'assistant', 'aide', 'care', 'service', 'specialist'];

  const searchWords = normalizedTitle.split(/\s+/);

  const potentialMatches = [];

  for (const [storedTitle, qualification] of Object.entries(jobTitleToQualification)) {
    if (genericTerms.some(term => storedTitle.includes(term))) {
      continue;
    }

    const storedWords = storedTitle.split(/\s+/);

    const matchingWords = searchWords.filter(word => storedWords.includes(word));
    const matchScore = matchingWords.length / Math.max(searchWords.length, storedWords.length);

    const isSubstringMatch = storedTitle.includes(normalizedTitle) || normalizedTitle.includes(storedTitle);

    let keywordRelevance = 0;
    const originalLower = originalTitle.toLowerCase();

    if (qualification.keywords) {
      for (const keyword of qualification.keywords) {
        if (originalLower.includes(keyword.toLowerCase())) {
          keywordRelevance += 1;
        }
      }
    }

    let semanticRelevance = 0;
    const originalUpper = originalTitle.toUpperCase();

    const hrTerms = ['HUMAN RESOURCES', 'HR', 'EXECUTIVE', 'MANAGER', 'ADMINISTRATOR', 'SUPERVISOR', 'OFFICER'];
    const isHrRole = hrTerms.some(term => originalUpper.includes(term));

    const hrKeywords = ['human resources', 'hr', 'manager', 'admin', 'office', 'supervisor', 'officer'];
    const hrKeywordsInTitle = ['human resources', 'hr', 'manager', 'admin', 'office', 'supervisor', 'officer'];

    const hasExecutiveInHrContext = qualification.job_title.toLowerCase().includes('executive') &&
                                   (qualification.job_title.toLowerCase().includes('human resources') ||
                                    qualification.job_title.toLowerCase().includes('hr') ||
                                    qualification.job_title.toLowerCase().includes('business') ||
                                    qualification.job_title.toLowerCase().includes('corporate'));

    const isHrQualification = hrKeywordsInTitle.some(kw => qualification.job_title.toLowerCase().includes(kw)) ||
                             (qualification.keywords && qualification.keywords.some(k =>
                                hrKeywords.includes(k.toLowerCase()))) ||
                             hasExecutiveInHrContext;

    if (isHrRole && isHrQualification) {
      semanticRelevance += 2; 
    }
    else if (!isHrRole && !isHrQualification) {
      semanticRelevance += 1;
    }

    if (isHrRole && !isHrQualification) {
      semanticRelevance -= 3; 
    }
    else if (!isHrRole && isHrQualification) {
      semanticRelevance -= 2; 
    }

    if (matchScore > 0 || isSubstringMatch) {
      potentialMatches.push({
        qualification,
        matchScore,
        isSubstringMatch,
        matchingWordsCount: matchingWords.length,
        keywordRelevance,
        semanticRelevance
      });
    }
  }

  potentialMatches.sort((a, b) => {
    if (b.semanticRelevance !== a.semanticRelevance) {
      return b.semanticRelevance - a.semanticRelevance;
    }

    if (b.keywordRelevance !== a.keywordRelevance) {
      return b.keywordRelevance - a.keywordRelevance;
    }

    if (a.isSubstringMatch && !b.isSubstringMatch) return -1;
    if (!a.isSubstringMatch && b.isSubstringMatch) return 1;

    if (b.matchingWordsCount !== a.matchingWordsCount) {
      return b.matchingWordsCount - a.matchingWordsCount;
    }

    return b.matchScore - a.matchScore;
  });

  if (potentialMatches.length > 0) {
    const bestMatch = potentialMatches[0];

    if ((bestMatch.matchingWordsCount > 0 || bestMatch.isSubstringMatch || bestMatch.keywordRelevance > 0)
        && bestMatch.semanticRelevance >= -1) {
      return bestMatch.qualification;
    }
  }

  return null;
}

module.exports = { getQualifications };
