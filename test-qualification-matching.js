// test-qualification-matching.js
const { getQualifications } = require('./services/qualificationService');

const testCases = [
  "JUNIOR QUANTITY SURVEYOR",
  "Nurse",
  "Driver",
  "Teacher",
  "Engineer",
  "Accountant",
  "Chef",
  "Electrician",
  "Plumber",
  "Mechanic"
];

console.log("Testing qualification matching:");
testCases.forEach(title => {
  const result = getQualifications(title);
  console.log(`\nOriginal: "${title}"`);
  console.log(`Mapped to: "${result.mappedJobTitle}"`);
  console.log(`Sector: "${result.sector}"`);
  console.log(`Qualifications: ${result.qualifications.length > 0 ? result.qualifications.join(', ') : 'None'}`);
});