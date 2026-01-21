const fs = require("fs");
const path = require("path");
const { normalizeTitle } = require("../utils/normalize");

const rawDict = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../dictionaries/tesda_unified_job_qualifications.json"))
);

const normalizedDict = {};

function buildDictionary() {
  for (const category in rawDict) {
    const familyList = rawDict[category];

    for (const family in familyList) {
      const role = familyList[family];

      normalizedDict[normalizeTitle(family)] = {
        category,
        family,
        role,
        type: "role",
      };

      (role.alternate_titles || []).forEach((alt) => {
        normalizedDict[normalizeTitle(alt)] = {
          category,
          family,
          role,
          type: "role",
        };
      });

      (role.specialized_titles || []).forEach((spec) => {
        normalizedDict[normalizeTitle(spec.title)] = {
          category,
          family,
          role,
          specialized: spec,
          type: "specialized",
        };

        (spec.alternate_titles || []).forEach((alt) => {
          normalizedDict[normalizeTitle(alt)] = {
            category,
            family,
            role,
            specialized: spec,
            type: "specialized",
          };
        });
      });
    }
  }
}

buildDictionary();

function getQualifications(title) {
  const normalized = normalizeTitle(title);

  if (normalizedDict[normalized]) {
    const entry = normalizedDict[normalized];
    let quals = entry.specialized
      ? entry.specialized.qualifications
      : entry.role.qualifications;

    if ((!quals || quals.length === 0) && entry.role && entry.role.specialized_titles) {
      for (const spec of entry.role.specialized_titles) {
        if (normalizeTitle(spec.title) === normalized ||
            (spec.alternate_titles && spec.alternate_titles.some(alt => normalizeTitle(alt) === normalized))) {
          return {
            category: entry.category,
            qualifications: spec.qualifications,
            originalJobTitle: title,
            mappedJobTitle: spec.title,
            sector: entry.category
          };
        }
      }

      if (!entry.specialized) { 
        const allQuals = new Set();
        for (const spec of entry.role.specialized_titles) {
          spec.qualifications.forEach(q => allQuals.add(q));
        }
        quals = Array.from(allQuals);
      }
    }

    return {
      category: entry.category,
      qualifications: quals,
      originalJobTitle: title,
      mappedJobTitle: entry.type === "specialized" ? entry.specialized.title : entry.family,
      sector: entry.category
    };
  }

  return {
    originalJobTitle: title,
    mappedJobTitle: title,
    sector: "Unknown",
    qualifications: []
  };
}

module.exports = { getQualifications };
